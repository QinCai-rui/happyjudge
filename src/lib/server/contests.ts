import { and, eq, inArray } from 'drizzle-orm';
import { encodeBase64url } from '@oslojs/encoding';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export type ContestStatus = 'upcoming' | 'live' | 'ended';

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
  contest: { id: string; authorId: string },
  user: { id: string; canAdmin: boolean } | null,
  contestId: string,
): Promise<boolean> {
  if (!user) return false;
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

  const problemMax = new Map<string, number>();
  for (const l of links) problemMax.set(l.problemId, l.points);

  const submissionScore = (s: { results: table.Result[] }) =>
    s.results.reduce((acc, r) => acc + (r.verdict === 'accepted' ? (r.score ?? 0) : 0), 0);

  // best per (user, problem), scaled to contest points by weight fraction.
  const best = new Map<string, Map<string, number>>();
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
  for (const s of submissions) {
    const raw = submissionScore(s);
    const total = s.scoreNormalizationTotal ?? weightTotal.get(s.problemId) ?? 1;
    const max = problemMax.get(s.problemId) ?? 100;
    // A stale or corrupted denominator must not create more than the problem's
    // assigned contest points (for example, after interrupted-testcase recovery).
    const scaled = total > 0 ? Math.min(max, Math.max(0, (raw / total) * max)) : 0;
    if (!best.has(s.userId)) best.set(s.userId, new Map());
    const m = best.get(s.userId)!;
    m.set(s.problemId, Math.max(m.get(s.problemId) ?? 0, scaled));
  }

  const rows = participants.map((p) => {
    const per = links.map(
      (l) => Math.round(((best.get(p.userId)?.get(l.problemId) ?? 0) + Number.EPSILON) * 100) / 100,
    );
    const total = Math.round((per.reduce((a, b) => a + b, 0) + Number.EPSILON) * 100) / 100;
    return { userId: p.userId, username: nameById.get(p.userId) ?? '???', per, total };
  });
  rows.sort((a, b) => b.total - a.total || a.username.localeCompare(b.username));
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

export function slugifyProblemId(title: string): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'problem';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}
