import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { assertUserExists } from '$lib/server/assertion';
import { slugifyProblemId } from '$lib/server/contests';
import { parseSamples } from '$lib/server/validation';

export const load: PageServerLoad = async ({ locals }) => {
  assertUserExists(locals.auth);
  const mine = await db.query.problem.findMany({
    where: eq(table.problem.authorId, locals.auth.user.id),
    orderBy: [desc(table.problem.createdAt)],
    limit: 100,
  });
  return { problems: mine, user: locals.auth.user };
};

export const actions = {
  create: async ({ request, locals }) => {
    assertUserExists(locals.auth);
    if (!locals.auth.user.canCreate && !locals.auth.user.canAdmin) error(403);
    const data = await request.formData();
    const title = (data.get('title')?.toString() ?? '').trim();
    const statement = (data.get('statement')?.toString() ?? '').replace(/\r\n|\r/g, '\n');
    const difficulty = data.get('difficulty')?.toString() ?? '';
    const timeLimit = Number(data.get('timeLimit'));
    const memoryLimit = Number(data.get('memoryLimit'));
    const tagsRaw = data.get('tags')?.toString() ?? '';
    const samplesRaw = data.get('samples')?.toString() ?? '[]';
    const homepage = data.get('homepage') === 'on';
    const isPublic = data.get('isPublic') === 'on';
    const displayGroup = data.get('displayGroup')?.toString().trim() || null;

    if (title.length < 3 || title.length > 120) return fail(400, { message: 'Title 3–120 chars' });
    if (!['easy', 'medium', 'hard', 'expert', 'insane'].includes(difficulty))
      return fail(400, { message: 'Pick a difficulty' });
    if (statement.length < 10) return fail(400, { message: 'Statement too short' });
    if (!Number.isInteger(timeLimit) || timeLimit < 250 || timeLimit > 15000)
      return fail(400, { message: 'Time limit 250–15000 ms' });
    if (!Number.isInteger(memoryLimit) || memoryLimit < 16 || memoryLimit > 2048)
      return fail(400, { message: 'Memory limit 16–2048 MB' });
    let samples: { input: string; output: string }[];
    try {
      samples = samplesRaw.trim() ? parseSamples(samplesRaw) : [];
    } catch {
      return fail(400, { message: 'Samples must be JSON: [{"input":"..","output":".."}]' });
    }
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim().slice(0, 24))
      .filter(Boolean)
      .slice(0, 12);

    const id = slugifyProblemId(title);
    await db.insert(table.problem).values({
      id: id as string,
      title,
      statement,
      difficulty: difficulty as 'easy' | 'medium' | 'hard' | 'expert' | 'insane',
      timeLimit,
      memoryLimit,
      sampleTestcases: samples,
      authorId: locals.auth.user.id,
      tags,
      homepage: locals.auth.user.canAdmin ? homepage : false,
      displayGroup,
      isPublic: locals.auth.user.canAdmin ? isPublic : isPublic,
    });
    return redirect(303, `/create/problem/${id}`);
  },
} satisfies Actions;
