import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import PQueue from 'p-queue';
import { execute } from './codefort';

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

async function executeTestcases(submission: table.Submission, problem: table.Problem) {
  try {
    const testcases = await db.query.testcase.findMany({
      where: eq(table.testcase.problemId, problem.id),
      limit: MAX_TESTCASES_PER_SUBMISSION + 1,
    });
    if (testcases.length > MAX_TESTCASES_PER_SUBMISSION) {
      throw new Error(`Too many testcases (>${MAX_TESTCASES_PER_SUBMISSION})`);
    }
    const results: table.Result[] = [];
    queue.start();
    await queue.addAll(
      testcases.map((testcase) => async () => {
        const stdin =
          testcase.input.length > MAX_STDIN_BYTES ? testcase.input.slice(0, MAX_STDIN_BYTES) : testcase.input;
        let result;
        try {
          result = await execute(
            submission.language,
            submission.code,
            stdin,
            4000, // reasonable compile time limit?
            problem.memoryLimit,
            problem.timeLimit,
            problem.memoryLimit,
          );
        } catch (e) {
          // Do not fail the whole submission on one Codefort error; record it.
          console.error('Codefort execution error:', e);
          results.push({
            id: testcase.id,
            caseGroup: testcase.caseGroup,
            memoryUsed: 0,
            output: '',
            timeTaken: 0,
            verdict: 'runtime_error',
            score: 0,
          });
          return;
        }

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

        results.push({
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
          // TODO: also fix this
          score: outputMatches ? testcase.weight : 0,
        });

        // TODO: socket.io broadcast
      }),
    );
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

  const submission = (
    await db
      .insert(table.submission)
      .values({
        problemId: problem.id,
        language,
        code,
        userId,
        contestId: contestId ?? null,
      })
      .returning()
  )[0];

  // Fire-and-forget judged work; errors are captured in executeTestcases.
  void executeTestcases(submission, problem);

  return submission;
}
