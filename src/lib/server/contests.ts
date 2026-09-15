import { and, eq, inArray } from 'drizzle-orm';
import { encodeBase64url } from '@oslojs/encoding';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export type ContestStatus = 'upcoming' | 'live' | 'ended';

/** Parse the timezone-free value emitted by <input type="datetime-local"> as UTC. */
export function parseUtcDateTime(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00.000Z`);
  return isNaN(+date) || date.toISOString().slice(0, 16) !== value ? null : date;
}

export type ScoreboardCell = {
  problemId: string;
  score: number;
  attempts: number;
  bestIndex: number | null;
  bestAt: Date | null;
  isFull: boolean;
  hasPending: boolean;
  isAttempted: boolean;
};

export type ScoreboardRow = {
  userId: string;
  username: string;
  cells: ScoreboardCell[];
  /** @deprecated Use cells instead. Retained for API compatibility. */
  per: number[];
  total: number;
  totalTimeSecs: number;
  rank: number;
};

export function contestStatus(c: { startsAt: Date; endsAt: Date }, now = new Date()): ContestStatus {
  if (now < c.startsAt) return 'upcoming';
  if (now >= c.endsAt) return 'ended';
  return 'live';
}

export async function isContestEditor(contestId: string, userId: string): Promise<boolean> {
  const row = await db.query.contestEditor.findFirst({
    where: and(eq(table.contestEditor.contestId, contestId), eq(table.contestEditor.userId, userId)),
  });
  return !!row;
}

export async function isContestManager(
  contest: { id: string; authorId: string },
  user: { id: string; canAdmin: boolean } | null,
): Promise<boolean> {
  if (!user) return false;
  if (user.canAdmin) return true;
  if (contest.authorId === user.id) return true;
  return isContestEditor(contest.id, user.id);
}

export async function isContestProblemEditor(
  problemId: string,
  user: { id: string; canAdmin: boolean } | null,
): Promise<boolean> {
  if (!user) return false;
  if (user.canAdmin) return true;
  const row = await db
    .select({ contestId: table.contestEditor.contestId })
    .from(table.contestEditor)
    .innerJoin(table.contestProblem, eq(table.contestEditor.contestId, table.contestProblem.contestId))
    .where(and(eq(table.contestEditor.userId, user.id), eq(table.contestProblem.problemId, problemId)))
    .limit(1);
  return row.length > 0;
}

export async function isContestParticipant(contestId: string, userId: string): Promise<boolean> {
  const row = await db.query.contestParticipant.findFirst({
    where: and(eq(table.contestParticipant.contestId, contestId), eq(table.contestParticipant.userId, userId)),
  });
  return !!row;
}

export async function canViewContest(
  contest: { id: string; authorId: string; isPublic: boolean },
  user: { id: string; canAdmin: boolean } | null,
  contestId: string,
): Promise<boolean> {
  if (!user) return false;
  if (contest.isPublic) return true;
  if (await isContestManager(contest, user)) return true;
  return isContestParticipant(contestId, user.id);
}

export async function contestProblemIds(contestId: string): Promise<string[]> {
  const rows = await db.query.contestProblem.findMany({
    where: eq(table.contestProblem.contestId, contestId),
  });
  return rows.sort((a, b) => a.position - b.position).map((r) => r.problemId);
}

/** Publish private contest problems once the window has passed and the
 * contest opted into release. Idempotent — safe to call from any load. */
export async function maybeReleaseContest(contest: { id: string; endsAt: Date; releaseOnEnd: boolean }): Promise<void> {
  if (!contest.releaseOnEnd) return;
  if (new Date() <= contest.endsAt) return;
  const links = await db.query.contestProblem.findMany({
    where: eq(table.contestProblem.contestId, contest.id),
    with: { contest: true },
  });
  for (const l of links) {
    const linkedContests = await db.query.contestProblem.findMany({
      where: eq(table.contestProblem.problemId, l.problemId),
      with: { contest: true },
    });
    if (linkedContests.some((link) => link.contest && contestStatus(link.contest) !== 'ended')) continue;
    await db.update(table.problem).set({ isPublic: true }).where(eq(table.problem.id, l.problemId));
  }
}

/** IOI-style: sum of best (max total score) per problem, live — no freeze. */
export async function computeScoreboard(contestId: string, canSeeUpcomingProblems = true) {
  const contest = await db.query.contest.findFirst({ where: eq(table.contest.id, contestId) });
  if (!contest) return { problems: [], rows: [] };
  if (!canSeeUpcomingProblems && contestStatus(contest) === 'upcoming') return { problems: [], rows: [] };

  const links = await db.query.contestProblem.findMany({
    where: eq(table.contestProblem.contestId, contestId),
    with: { problem: true },
  });
  links.sort((a, b) => a.position - b.position);

  const participants = await db.query.contestParticipant.findMany({
    where: eq(table.contestParticipant.contestId, contestId),
  });
  if (participants.length === 0) return { problems: links, rows: [] };
  // Fetch usernames separately to keep typing simple.
  const participantUsers = await db.query.user.findMany({
    where: inArray(
      table.user.id,
      participants.map((p) => p.userId),
    ),
  });
  const nameById = new Map(participantUsers.map((u) => [u.id, u.username]));

  const submissions = await db.select().from(table.submission).where(eq(table.submission.contestId, contestId));
  submissions.sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime() || a.id - b.id);

  const problemMax = new Map<string, number>();
  for (const l of links) problemMax.set(l.problemId, l.points);

  const submissionScore = (s: { results: table.Result[] }) =>
    s.results.reduce((acc, r) => acc + (r.verdict === 'accepted' ? (r.score ?? 0) : 0), 0);

  const weightTotal = new Map<string, number>();
  // One batched testcase fetch for normalization (no N+1).
  const problemIds = links.map((l) => l.problemId);
  const allTestcases = problemIds.length
    ? await db.query.testcase.findMany({ where: inArray(table.testcase.problemId, problemIds) })
    : [];
  for (const l of links) {
    const total = allTestcases.filter((t) => t.problemId === l.problemId).reduce((a, t) => a + (t.weight ?? 1), 0);
    weightTotal.set(l.problemId, total || 1);
  }
  const submissionsByUser = new Map<string, Map<string, (typeof submissions)[number][]>>();
  for (const submission of submissions) {
    if (!problemMax.has(submission.problemId)) continue;
    if (!submissionsByUser.has(submission.userId)) submissionsByUser.set(submission.userId, new Map());
    const byProblem = submissionsByUser.get(submission.userId)!;
    const attempts = byProblem.get(submission.problemId) ?? [];
    attempts.push(submission);
    byProblem.set(submission.problemId, attempts);
  }

  const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

  const rows: ScoreboardRow[] = participants.map((p) => {
    const cells = links.map((link): ScoreboardCell => {
      const attempts = submissionsByUser.get(p.userId)?.get(link.problemId) ?? [];
      if (attempts.length === 0) {
        return {
          problemId: link.problemId,
          score: 0,
          attempts: 0,
          bestIndex: null,
          bestAt: null,
          isFull: false,
          hasPending: false,
          isAttempted: false,
        };
      }

      let bestScore = 0;
      let bestIndex: number | null = null;
      let bestAt: Date | null = null;
      let hasPending = false;
      for (const [index, submission] of attempts.entries()) {
        if (submission.results.length === 0) {
          hasPending = true;
          continue;
        }
        const raw = submissionScore(submission);
        const total = submission.scoreNormalizationTotal ?? weightTotal.get(link.problemId) ?? 1;
        // A stale denominator must not exceed the contest problem's assigned points.
        const scaled = total > 0 ? Math.min(link.points, Math.max(0, (raw / total) * link.points)) : 0;
        if (scaled > bestScore) {
          bestScore = scaled;
          bestIndex = index + 1;
          bestAt = submission.submittedAt;
        }
      }

      const score = round2(bestScore);
      return {
        problemId: link.problemId,
        score,
        attempts: attempts.length,
        bestIndex,
        bestAt,
        isFull: link.points > 0 && score >= link.points - 1e-9,
        hasPending,
        isAttempted: true,
      };
    });
    const per = cells.map((cell) => cell.score);
    const total = round2(per.reduce((sum, score) => sum + score, 0));
    const totalTimeSecs = cells.reduce((latest, cell) => {
      if (cell.score <= 0 || !cell.bestAt) return latest;
      return Math.max(latest, Math.max(0, Math.floor((cell.bestAt.getTime() - contest.startsAt.getTime()) / 1000)));
    }, 0);
    return { userId: p.userId, username: nameById.get(p.userId) ?? '???', cells, per, total, totalTimeSecs, rank: 0 };
  });
  rows.sort((a, b) => b.total - a.total || a.totalTimeSecs - b.totalTimeSecs || a.username.localeCompare(b.username));
  let lastTotal: number | null = null;
  let lastTime: number | null = null;
  for (const [index, row] of rows.entries()) {
    if (row.total !== lastTotal || row.totalTimeSecs !== lastTime) {
      row.rank = index + 1;
      lastTotal = row.total;
      lastTime = row.totalTimeSecs;
    } else {
      row.rank = rows[index - 1].rank;
    }
  }
  return { problems: links, rows };
}

export function generateContestId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(bytes)
    .map((b) => b.toString(36))
    .join('')
    .replace(/[^a-z0-9]/g, 'x')
    .slice(0, 12)
    .padEnd(12, 'a');
}

export function generateInviteToken(): string {
  return encodeBase64url(crypto.getRandomValues(new Uint8Array(24)));
}
