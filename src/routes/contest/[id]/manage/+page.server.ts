import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { assertUserExists } from '$lib/server/assertion';
import { contestStatus, isContestManager } from '$lib/server/contests';

export const load: PageServerLoad = async ({ params, locals }) => {
  assertUserExists(locals.auth);
  const contest = await db.query.contest.findFirst({ where: eq(table.contest.id, params.id) });
  if (!contest) error(404, 'Not found');
  if (!(await isContestManager(contest, locals.auth.user))) error(403);

  const links = await db.query.contestProblem.findMany({
    where: eq(table.contestProblem.contestId, params.id),
    with: { problem: true },
  });
  links.sort((a, b) => a.position - b.position);
  const participants = await db.query.contestParticipant.findMany({
    where: eq(table.contestParticipant.contestId, params.id),
  });
  const users = participants.length
    ? await db.query.user.findMany({
        where: (await import('drizzle-orm')).inArray(
          table.user.id,
          participants.map((p) => p.userId),
        ),
      })
    : [];
  const ownProblems = await db.query.problem.findMany({
    where: eq(table.problem.authorId, locals.auth.user.id),
    limit: 100,
  });
  return {
    contest: { ...contest, status: contestStatus(contest) },
    links,
    participants: participants.map((p) => ({
      ...p,
      username: users.find((u) => u.id === p.userId)?.username ?? p.userId,
    })),
    ownProblems,
  };
};

export const actions = {
  update: async ({ params, request, locals }) => {
    assertUserExists(locals.auth);
    const contest = await db.query.contest.findFirst({ where: eq(table.contest.id, params.id) });
    if (!contest) error(404, 'Not found');
    if (!(await isContestManager(contest, locals.auth.user))) error(403);
    const data = await request.formData();
    const title = (data.get('title')?.toString() ?? '').trim();
    const description = (data.get('description')?.toString() ?? '').trim().slice(0, 4000);
    const startsAt = new Date(data.get('startsAt')?.toString() ?? '');
    const endsAt = new Date(data.get('endsAt')?.toString() ?? '');
    const releaseOnEnd = data.get('releaseOnEnd') === 'on';
    if (title.length < 3 || title.length > 120) return fail(400, { message: 'Title 3–120 chars' });
    if (isNaN(+startsAt) || isNaN(+endsAt)) return fail(400, { message: 'Invalid dates' });
    if (+endsAt <= +startsAt) return fail(400, { message: 'End must be after start' });
    await db
      .update(table.contest)
      .set({ title, description, startsAt, endsAt, releaseOnEnd })
      .where(eq(table.contest.id, params.id));
    // Auto-release if contest already ended and flag is on.
    if (releaseOnEnd && new Date() > endsAt) {
      const links = await db.query.contestProblem.findMany({
        where: eq(table.contestProblem.contestId, params.id),
      });
      for (const l of links) {
        await db.update(table.problem).set({ isPublic: true }).where(eq(table.problem.id, l.problemId));
      }
    }
    return { message: 'Saved.' };
  },
  addProblem: async ({ params, request, locals }) => {
    assertUserExists(locals.auth);
    const contest = await db.query.contest.findFirst({ where: eq(table.contest.id, params.id) });
    if (!contest) error(404, 'Not found');
    if (!(await isContestManager(contest, locals.auth.user))) error(403);
    const data = await request.formData();
    const problemId = data.get('problemId')?.toString().trim() ?? '';
    const points = Number(data.get('points'));
    if (!problemId) return fail(400, { message: 'Problem required' });
    if (!Number.isInteger(points) || points <= 0 || points > 10000)
      return fail(400, { message: 'Points 1–10000' });
    const problem = await db.query.problem.findFirst({ where: eq(table.problem.id, problemId) });
    if (!problem) return fail(404, { message: 'Problem not found' });
    if (problem.authorId !== locals.auth.user.id && !locals.auth.user.canAdmin)
      return fail(403, { message: 'You can only add your own problems' });
    const existing = await db.query.contestProblem.findMany({
      where: eq(table.contestProblem.contestId, params.id),
    });
    const position = existing.length;
    await db
      .insert(table.contestProblem)
      .values({ contestId: params.id, problemId, position, points })
      .onConflictDoNothing();
    // Contest problems stay hidden until released.
    await db.update(table.problem).set({ isPublic: false }).where(eq(table.problem.id, problemId));
    return { message: 'Added.' };
  },
  removeProblem: async ({ params, request, locals }) => {
    assertUserExists(locals.auth);
    const contest = await db.query.contest.findFirst({ where: eq(table.contest.id, params.id) });
    if (!contest) error(404, 'Not found');
    if (!(await isContestManager(contest, locals.auth.user))) error(403);
    const data = await request.formData();
    const problemId = data.get('problemId')?.toString() ?? '';
    await db
      .delete(table.contestProblem)
      .where(
        and(eq(table.contestProblem.contestId, params.id), eq(table.contestProblem.problemId, problemId)),
      );
    // Restore visibility if the problem is no longer in any contest.
    const remaining = await db.query.contestProblem.findMany({
      where: eq(table.contestProblem.problemId, problemId),
      limit: 1,
    });
    if (remaining.length === 0 && problemId) {
      await db.update(table.problem).set({ isPublic: true }).where(eq(table.problem.id, problemId));
    }
    return { message: 'Removed.' };
  },
  invite: async ({ params, request, locals }) => {
    assertUserExists(locals.auth);
    const contest = await db.query.contest.findFirst({ where: eq(table.contest.id, params.id) });
    if (!contest) error(404, 'Not found');
    if (!(await isContestManager(contest, locals.auth.user))) error(403);
    const formData = await request.formData();
    const username = (formData.get('username')?.toString() ?? '').trim();
    if (!username) return fail(400, { message: 'Username required' });
    const invited = await db.query.user.findFirst({ where: eq(table.user.username, username) });
    // Neutral response in both cases to avoid user enumeration.
    if (!invited) return { message: 'If that user exists, they were invited.' };
    await db
      .insert(table.contestParticipant)
      .values({ contestId: params.id, userId: invited.id })
      .onConflictDoNothing();
    return { message: 'If that user exists, they were invited.' };
  },
  uninvite: async ({ params, request, locals }) => {
    assertUserExists(locals.auth);
    const contest = await db.query.contest.findFirst({ where: eq(table.contest.id, params.id) });
    if (!contest) error(404, 'Not found');
    if (!(await isContestManager(contest, locals.auth.user))) error(403);
    const data = await request.formData();
    const userId = data.get('userId')?.toString() ?? '';
    if (userId === contest.authorId) return fail(400, { message: 'Cannot remove the author' });
    await db
      .delete(table.contestParticipant)
      .where(
        and(eq(table.contestParticipant.contestId, params.id), eq(table.contestParticipant.userId, userId)),
      );
    return { message: 'Removed.' };
  },
  remove: async ({ params, locals }) => {
    assertUserExists(locals.auth);
    const contest = await db.query.contest.findFirst({ where: eq(table.contest.id, params.id) });
    if (!contest) error(404, 'Not found');
    if (!(await isContestManager(contest, locals.auth.user))) error(403);
    await db.delete(table.contest).where(eq(table.contest.id, params.id));
    return redirect(303, '/contests');
  },
} satisfies Actions;
