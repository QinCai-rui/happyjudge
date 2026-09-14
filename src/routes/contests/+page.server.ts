import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { assertUserExists } from '$lib/server/assertion';
import { contestStatus, generateContestId, generateInviteToken } from '$lib/server/contests';

export const load: PageServerLoad = async ({ locals }) => {
  assertUserExists(locals.auth);
  const me = locals.auth.user;
  let contests;
  if (me.canAdmin) {
    contests = await db.query.contest.findMany({ orderBy: [desc(table.contest.startsAt)], limit: 100 });
  } else {
    const parts = await db.query.contestParticipant.findMany({
      where: eq(table.contestParticipant.userId, me.id),
    });
    const own = await db.query.contest.findMany({ where: eq(table.contest.authorId, me.id) });
    const editorGrants = await db.query.contestEditor.findMany({
      where: eq(table.contestEditor.userId, me.id),
    });
    const byId = new Map();
    const publicContests = await db.query.contest.findMany({ where: eq(table.contest.isPublic, true) });
    for (const contest of publicContests) byId.set(contest.id, contest);
    for (const o of own) byId.set(o.id, o);
    const ids = [...parts.map((p) => p.contestId), ...editorGrants.map((e) => e.contestId)];
    if (ids.length) {
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
    const user = locals.auth.user;
    if (!user.canCreate && !user.canAdmin) error(403);
    const data = await request.formData();
    const title = (data.get('title')?.toString() ?? '').trim();
    const description = (data.get('description')?.toString() ?? '').trim().slice(0, 4000);
    const startsAt = new Date(data.get('startsAt')?.toString() ?? '');
    const endsAt = new Date(data.get('endsAt')?.toString() ?? '');
    const releaseOnEnd = data.get('releaseOnEnd') === 'on';
    const isPublic = data.get('isPublic') === 'on';
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
      inviteToken: generateInviteToken(),
      authorId: user.id,
      isPublic,
      releaseOnEnd,
    });
    return redirect(303, `/contest/${id}/manage`);
  },
} satisfies Actions;
