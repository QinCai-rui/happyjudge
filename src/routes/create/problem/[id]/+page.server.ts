import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { assertUserExists } from '$lib/server/assertion';

export const load: PageServerLoad = async ({ params, locals }) => {
  assertUserExists(locals.auth);
  const problem = await db.query.problem.findFirst({ where: eq(table.problem.id, params.id) });
  if (!problem) error(404, 'Not found');
  if (problem.authorId !== locals.auth.user.id && !locals.auth.user.canAdmin) error(403);
  return { problem, user: locals.auth.user };
};

export const actions = {
  save: async ({ params, request, locals }) => {
    assertUserExists(locals.auth);
    const problem = await db.query.problem.findFirst({ where: eq(table.problem.id, params.id) });
    if (!problem) error(404, 'Not found');
    if (problem.authorId !== locals.auth.user.id && !locals.auth.user.canAdmin) error(403);

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
      samples = JSON.parse(samplesRaw);
      if (!Array.isArray(samples)) throw new Error();
    } catch {
      return fail(400, { message: 'Samples must be valid JSON array' });
    }
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim().slice(0, 24))
      .filter(Boolean)
      .slice(0, 12);

    await db
      .update(table.problem)
      .set({
        title,
        statement,
        difficulty: difficulty as 'easy' | 'medium' | 'hard' | 'expert' | 'insane',
        timeLimit,
        memoryLimit,
        sampleTestcases: samples,
        tags,
        homepage: locals.auth.user.canAdmin ? homepage : problem.homepage,
        isPublic,
        displayGroup,
      })
      .where(eq(table.problem.id, params.id));
    return { message: 'Saved.' };
  },
  remove: async ({ params, locals }) => {
    assertUserExists(locals.auth);
    const problem = await db.query.problem.findFirst({ where: eq(table.problem.id, params.id) });
    if (!problem) error(404, 'Not found');
    if (problem.authorId !== locals.auth.user.id && !locals.auth.user.canAdmin) error(403);
    const inContest = await db.query.contestProblem.findMany({
      where: eq(table.contestProblem.problemId, params.id),
      limit: 1,
    });
    if (inContest.length > 0) return fail(400, { message: 'Remove from contests first' });
    await db.delete(table.problem).where(eq(table.problem.id, params.id));
    return redirect(303, '/create/problem');
  },
} satisfies Actions;
