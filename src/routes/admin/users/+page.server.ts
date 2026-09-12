import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import { assertUserExists } from '$lib/server/assertion';

export const load: PageServerLoad = async ({ locals }) => {
  assertUserExists(locals.auth);
  if (!locals.auth.user.canAdmin) error(403);
  const users = await db.query.user.findMany({ orderBy: [desc(table.user.id)], limit: 200 });
  return { users: users.map((u) => ({ id: u.id, username: u.username, canCreate: u.canCreate, canAdmin: u.canAdmin })) };
};

export const actions = {
  update: async ({ request, locals }) => {
    assertUserExists(locals.auth);
    if (!locals.auth.user.canAdmin) error(403);
    const data = await request.formData();
    const id = data.get('id')?.toString() ?? '';
    const canCreate = data.get('canCreate') === 'on';
    const canAdmin = data.get('canAdmin') === 'on';
    if (!id) return fail(400, { message: 'Bad id' });
    if (id === locals.auth.user.id && !canAdmin) return fail(400, { message: 'You cannot demote yourself' });
    const { eq } = await import('drizzle-orm');
    await db.update(table.user).set({ canCreate, canAdmin }).where(eq(table.user.id, id));
    return { message: 'Updated.' };
  },
} satisfies Actions;
