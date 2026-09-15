import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { and, eq, inArray, lt } from 'drizzle-orm';
import PQueue from 'p-queue';
import { execute, type CodefortResult } from './codefort';

// Resource-exhaustion guards. Tune to your hardware / Codefort capacity.
export const MAX_CODE_BYTES = 128 * 1024; // 128 KiB per submission
export const MAX_STDIN_BYTES = 256 * 1024; // per-testcase stdin cap
export const MAX_TESTCASES_PER_SUBMISSION = 100;
export const MAX_PENDING_JOBS = 200; // bounded queue: reject with 429 when full

const queue = new PQueue({
  concurrency: 1, // Only one execution at a time!
  autoStart: true,
});

export function getSubmissionQueueDepth(): number {
  return queue.size + queue.pending;
}

export function isSubmissionQueueFull(): boolean {
  return getSubmissionQueueDepth() >= MAX_PENDING_JOBS;
}

type SubmissionForDisplay = Pick<
  table.Submission,
  'id' | 'problemId' | 'contestId' | 'results' | 'scoreNormalizationTotal'
>;

export type DisplaySubmissionScore = {
  total: number;
  maximum: number;
  results: Array<table.Result & { score: number }>;
};

/** Convert internal testcase weights to participant-facing points. */
export async function getDisplaySubmissionScores(
  submissions: SubmissionForDisplay[],
): Promise<Map<number, DisplaySubmissionScore>> {
  if (!submissions.length) return new Map();

  const contestIds = [...new Set(submissions.flatMap((submission) => (submission.contestId ? [submission.contestId] : [])))];
  const problemIds = [...new Set(submissions.map((submission) => submission.problemId))];
  const [links, testcases] = await Promise.all([
    contestIds.length
      ? db.query.contestProblem.findMany({ where: inArray(table.contestProblem.contestId, contestIds) })
      : [],
    db.query.testcase.findMany({ where: inArray(table.testcase.problemId, problemIds) }),
  ]);
  const pointsByContestProblem = new Map(
    links.map((link) => [`${link.contestId}\0${link.problemId}`, link.points]),
  );
  const weightByProblem = new Map<string, number>();
  for (const testcase of testcases) {
    weightByProblem.set(testcase.problemId, (weightByProblem.get(testcase.problemId) ?? 0) + testcase.weight);
  }
  const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

  return new Map(
    submissions.map((submission) => {
      const denominator = submission.scoreNormalizationTotal ?? weightByProblem.get(submission.problemId) ?? 1;
      const maximum = submission.contestId
        ? (pointsByContestProblem.get(`${submission.contestId}\0${submission.problemId}`) ?? 0)
        : 100;
      const scale = denominator > 0 ? maximum / denominator : 0;
      const rawTotal = submission.results.reduce((total, result) => total + result.score, 0);
      return [
        submission.id,
        {
          total: round2(Math.min(maximum, Math.max(0, rawTotal * scale))),
          maximum,
          results: submission.results.map((result) => ({
            ...result,
            score: round2(Math.min(maximum, Math.max(0, result.score * scale))),
          })),
        },
      ];
    }),
  );
}

export async function runCustomInput(
  language: string,
  code: string,
  stdin: string,
  problem: table.Problem,
): Promise<CodefortResult> {
  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
    throw Object.assign(new Error(`Code too large (>${MAX_CODE_BYTES} bytes)`), { status: 413 });
  }
  if (Buffer.byteLength(stdin, 'utf8') > MAX_STDIN_BYTES) {
    throw Object.assign(new Error(`Input too large (>${MAX_STDIN_BYTES} bytes)`), { status: 413 });
  }
  if (isSubmissionQueueFull()) {
    throw Object.assign(new Error('Execution queue is full, try again later'), { status: 429 });
  }

  const result = await queue.add(() =>
    execute(language, code, stdin, 4000, problem.memoryLimit, problem.timeLimit, problem.memoryLimit),
  );
  if (!result) throw new Error('Execution queue stopped before the run completed');
  return result;
}

async function executeTestcases(submission: table.Submission, problem: table.Problem, testcases: table.Testcase[]) {
  try {
    queue.start();
    const results = await Promise.all(
      testcases.map(async (testcase) => {
        const stdin =
          testcase.input.length > MAX_STDIN_BYTES ? testcase.input.slice(0, MAX_STDIN_BYTES) : testcase.input;
        try {
          const result = await queue.add(() =>
            execute(
              submission.language,
              submission.code,
              stdin,
              4000, // reasonable compile time limit?
              problem.memoryLimit,
              problem.timeLimit,
              problem.memoryLimit,
            ),
          );
          if (!result) throw new Error('Execution queue stopped before the run completed');

          const outputMatches =
            result.stdout
              .split('\n')
              .map((x) => x.trim())
              .join('')
              .trim() ===
            testcase.output
              .split('\n')
              .map((x) => x.trim())
              .join('')
              .trim();

          return {
            id: testcase.id,
            caseGroup: testcase.caseGroup,
            memoryUsed: 0, // TODO
            output: result.stdout.slice(0, MAX_STDIN_BYTES),
            timeTaken: result.stats.run.realTime,
            // TODO: fix this
            verdict: outputMatches
              ? 'accepted'
              : result.exitCode !== 0
                ? 'runtime_error'
                : result.stats.run.realTime >= problem.timeLimit
                  ? 'time_limit_exceeded'
                  : 'wrong_answer',
            score: outputMatches ? testcase.weight : 0,
          } satisfies table.Result;
        } catch (e) {
          // Do not fail the whole submission on one Codefort error; record it.
          console.error('Codefort execution error:', e);
          return {
            id: testcase.id,
            caseGroup: testcase.caseGroup,
            memoryUsed: 0,
            output: '',
            timeTaken: 0,
            verdict: 'runtime_error',
            score: 0,
          } satisfies table.Result;
        }
      }),
    );
    if (submission.scoringVersion === table.caseGroupAllOrNothingV1) {
      const groupPassed = new Map<string, boolean>();
      for (const result of results)
        groupPassed.set(result.caseGroup, (groupPassed.get(result.caseGroup) ?? true) && result.verdict === 'accepted');
      for (const result of results) if (!groupPassed.get(result.caseGroup)) result.score = 0;
    }
    await db.update(table.submission).set({ results }).where(eq(table.submission.id, submission.id));
  } catch (e) {
    console.error('Submission processing failed:', e);
    await db
      .update(table.submission)
      .set({
        results: [
          {
            id: -1,
            caseGroup: 'System',
            memoryUsed: 0,
            output: '',
            timeTaken: 0,
            verdict: 'runtime_error',
            score: 0,
          },
        ],
      })
      .where(eq(table.submission.id, submission.id));
  }
}

/** Resume work that was interrupted by an application restart. */
export async function resumeInterruptedSubmissions() {
  try {
    const cutoff = new Date(Date.now() - 5 * 60_000);
    const interrupted = await db.query.submission.findMany({
      where: and(eq(table.submission.results, []), lt(table.submission.submittedAt, cutoff)),
    });
    for (const submission of interrupted) {
      const problem = await db.query.problem.findFirst({ where: eq(table.problem.id, submission.problemId) });
      if (!problem) continue;
      const testcases = await db.query.testcase.findMany({
        where: eq(table.testcase.problemId, problem.id),
        limit: MAX_TESTCASES_PER_SUBMISSION + 1,
      });
      if (testcases.length <= MAX_TESTCASES_PER_SUBMISSION) void executeTestcases(submission, problem, testcases);
    }
  } catch (e) {
    console.error('Interrupted submission recovery failed:', e);
  }
}

export default async function createSubmission(
  language: string,
  code: string,
  problemId: string,
  userId: string,
  contestId?: string | null,
) {
  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
    throw Object.assign(new Error(`Code too large (>${MAX_CODE_BYTES} bytes)`), { status: 413 });
  }
  if (isSubmissionQueueFull()) {
    throw Object.assign(new Error('Submission queue is full, try again later'), { status: 429 });
  }

  const problem = await db.query.problem.findFirst({
    where: eq(table.problem.id, problemId),
  });
  if (!problem) throw Object.assign(new Error('Problem not found'), { status: 404 });

  const testcases = await db.query.testcase.findMany({
    where: eq(table.testcase.problemId, problem.id),
    limit: MAX_TESTCASES_PER_SUBMISSION + 1,
  });
  if (testcases.length > MAX_TESTCASES_PER_SUBMISSION) {
    throw Object.assign(new Error(`Too many testcases (>${MAX_TESTCASES_PER_SUBMISSION})`), { status: 400 });
  }
  const scoreNormalizationTotal = testcases.reduce((total, testcase) => total + testcase.weight, 0) || 1;

  const submission = (
    await db
      .insert(table.submission)
      .values({
        problemId: problem.id,
        language,
        code,
        userId,
        contestId: contestId ?? null,
        scoreNormalizationTotal,
        scoringVersion: table.caseGroupAllOrNothingV1,
      })
      .returning()
  )[0];

  // Fire-and-forget judged work; errors are captured in executeTestcases.
  void executeTestcases(submission, problem, testcases);

  return submission;
}
