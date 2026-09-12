import { error, fail } from '@sveltejs/kit';
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
  const testcases = await db.query.testcase.findMany({ where: eq(table.testcase.problemId, params.id) });
  testcases.sort((a, b) => a.id - b.id);
  return { problem, testcases };
};

export const actions = {
  add: async ({ params, request, locals }) => {
    assertUserExists(locals.auth);
    const problem = await db.query.problem.findFirst({ where: eq(table.problem.id, params.id) });
    if (!problem) error(404, 'Not found');
    if (problem.authorId !== locals.auth.user.id && !locals.auth.user.canAdmin) error(403);
    const data = await request.formData();
    const input = (data.get('input')?.toString() ?? '').replace(/\r\n|\r/g, '\n');
    const output = (data.get('output')?.toString() ?? '').replace(/\r\n|\r/g, '\n');
    const caseGroup = (data.get('caseGroup')?.toString() ?? 'Misc').trim().slice(0, 40) || 'Misc';
    const weight = Number(data.get('weight'));
    const isHidden = data.get('isHidden') === 'on';
    if (!Number.isInteger(weight) || weight < 0 || weight > 10000)
      return fail(400, { message: 'Weight must be 0–10000' });
    if (output.length === 0) return fail(400, { message: 'Output required' });
    await db.insert(table.testcase).values({ problemId: params.id, input, output, caseGroup, weight, isHidden });
    return { message: 'Added.' };
  },
  update: async ({ request, locals }) => {
    assertUserExists(locals.auth);
    const data = await request.formData();
    const id = Number(data.get('id'));
    if (!Number.isInteger(id)) return fail(400, { message: 'Bad id' });
    const tc = await db.query.testcase.findFirst({ where: eq(table.testcase.id, id) });
    if (!tc) error(404, 'Not found');
    const problem = await db.query.problem.findFirst({ where: eq(table.problem.id, tc.problemId) });
    if (!problem) error(404, 'Not found');
    if (problem.authorId !== locals.auth.user.id && !locals.auth.user.canAdmin) error(403);
    const input = (data.get('input')?.toString() ?? '').replace(/\r\n|\r/g, '\n');
    const output = (data.get('output')?.toString() ?? '').replace(/\r\n|\r/g, '\n');
    const caseGroup = (data.get('caseGroup')?.toString() ?? 'Misc').trim().slice(0, 40) || 'Misc';
    const weight = Number(data.get('weight'));
    const isHidden = data.get('isHidden') === 'on';
    if (!Number.isInteger(weight) || weight < 0 || weight > 10000)
      return fail(400, { message: 'Weight must be 0–10000' });
    await db.update(table.testcase).set({ input, output, caseGroup, weight, isHidden }).where(eq(table.testcase.id, id));
    return { message: 'Saved.' };
  },
  remove: async ({ request, locals }) => {
    assertUserExists(locals.auth);
    const data = await request.formData();
    const id = Number(data.get('id'));
    const tc = await db.query.testcase.findFirst({ where: eq(table.testcase.id, id) });
    if (!tc) error(404, 'Not found');
    const problem = await db.query.problem.findFirst({ where: eq(table.problem.id, tc.problemId) });
    if (!problem) error(404, 'Not found');
    if (problem.authorId !== locals.auth.user.id && !locals.auth.user.canAdmin) error(403);
    await db.delete(table.testcase).where(eq(table.testcase.id, id));
    return { message: 'Deleted.' };
  },
} satisfies Actions;
