import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { assertUserExists } from '$lib/server/assertion';

export const load: PageServerLoad = async ({ params, locals, url }) => {
  if (!locals.auth.user) {
    redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
  }
  const contest = await db.query.contest.findFirst({
    where: and(eq(table.contest.id, params.id), eq(table.contest.inviteToken, params.token)),
  });
  if (!contest) error(404, 'Invite link is invalid or expired');
  return { contest };
};

export const actions = {
  accept: async ({ params, locals }) => {
    assertUserExists(locals.auth);
    const contest = await db.query.contest.findFirst({
      where: and(eq(table.contest.id, params.id), eq(table.contest.inviteToken, params.token)),
    });
    if (!contest) error(404, 'Invite link is invalid or expired');
    await db
      .insert(table.contestParticipant)
      .values({ contestId: contest.id, userId: locals.auth.user.id })
      .onConflictDoNothing();
    return redirect(303, `/contest/${contest.id}`);
  },
} satisfies Actions;
