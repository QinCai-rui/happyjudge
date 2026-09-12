import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { assertUserExists } from '$lib/server/assertion';
import { contestStatus, generateContestId } from '$lib/server/contests';

export const load: PageServerLoad = async ({ locals }) => {
  assertUserExists(locals.auth);
  const me = locals.auth.user;
  let contests;
  if (me.canAdmin) {
    contests = await db.query.contest.findMany({ orderBy: [desc(table.contest.startsAt)], limit: 100 });
  } else {
    const parts = await db.query.contestParticipant.findMany({
      where: eq(table.contestParticipant.userId, me.id),
      with: { contest: true } as never,
    });
    const own = await db.query.contest.findMany({ where: eq(table.contest.authorId, me.id) });
    const byId = new Map();
    for (const o of own) byId.set(o.id, o);
    const ids = parts.map((p) => p.contestId);
    if (ids.length) {
      const { inArray } = await import('drizzle-orm');
      const joined = await db.query.contest.findMany({ where: inArray(table.contest.id, ids) });
      for (const j of joined) byId.set(j.id, j);
    }
    contests = [...byId.values()].sort((a, b) => +b.startsAt - +a.startsAt);
  }
  return {
    user: me,
    contests: contests.map((c) => ({ ...c, status: contestStatus(c) })),
  };
};

export const actions = {
  create: async ({ request, locals }) => {
    assertUserExists(locals.auth);
    if (!locals.auth.user.canCreate && !locals.auth.user.canAdmin) error(403);
    const data = await request.formData();
    const title = (data.get('title')?.toString() ?? '').trim();
    const description = (data.get('description')?.toString() ?? '').trim().slice(0, 4000);
    const startsAt = new Date(data.get('startsAt')?.toString() ?? '');
    const endsAt = new Date(data.get('endsAt')?.toString() ?? '');
    const releaseOnEnd = data.get('releaseOnEnd') === 'on';
    if (title.length < 3 || title.length > 120) return fail(400, { message: 'Title 3–120 chars' });
    if (isNaN(+startsAt) || isNaN(+endsAt)) return fail(400, { message: 'Invalid dates' });
    if (+endsAt <= +startsAt) return fail(400, { message: 'End must be after start' });
    const id = generateContestId();
    await db.insert(table.contest).values({
      id,
      title,
      description,
      startsAt,
      endsAt,
      authorId: locals.auth.user.id,
      releaseOnEnd,
    });
    // Author is implicitly a participant/manager; add invite for themselves.
    await db.insert(table.contestParticipant).values({ contestId: id, userId: locals.auth.user.id });
    return redirect(303, `/contest/${id}/manage`);
  },
} satisfies Actions;
