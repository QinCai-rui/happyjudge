import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { assertUserExists } from '$lib/server/assertion';
import { getLanguages } from '$lib/server/codefort';
import createSubmission, { MAX_CODE_BYTES } from '$lib/server/submissions';
import { canViewContest, contestStatus } from '$lib/server/contests';
import { checkRateLimit } from '$lib/server/rate-limit';

const SUBMIT_LIMIT = 10;
const SUBMIT_WINDOW_MS = 60_000;

export const load: PageServerLoad = async ({ params, locals }) => {
  assertUserExists(locals.auth);
  const contest = await db.query.contest.findFirst({ where: eq(table.contest.id, params.id) });
  if (!contest) error(404, 'Not found');
  if (!(await canViewContest(contest, locals.auth.user, params.id))) error(404, 'Not found');

  const status = contestStatus(contest);
  const link = await db.query.contestProblem.findFirst({
    where: and(
      eq(table.contestProblem.contestId, params.id),
      eq(table.contestProblem.problemId, params.pid),
    ),
    with: { problem: true },
  });
  if (!link?.problem) error(404, 'Not found');
  if (status !== 'live') error(403, status === 'upcoming' ? 'Contest has not started' : 'Contest has ended');

  let languages: { id: string; name: string }[] = [];
  try {
    languages = await getLanguages();
  } catch (e) {
    console.error('Failed to load Codefort languages:', e);
    error(503, 'Execution service unavailable');
  }
  return { contest: { ...contest, status }, problem: link.problem, points: link.points, languages };
};

export const actions = {
  submit: async ({ params, request, locals }) => {
    assertUserExists(locals.auth);
    const contest = await db.query.contest.findFirst({ where: eq(table.contest.id, params.id) });
    if (!contest) error(404, 'Not found');
    if (!(await canViewContest(contest, locals.auth.user, params.id))) error(404, 'Not found');
    // Server-side window check — never rely on UI hiding.
    const now = new Date();
    if (now < contest.startsAt || now > contest.endsAt) error(403, 'Submissions closed for this contest');

    const link = await db.query.contestProblem.findFirst({
      where: and(
        eq(table.contestProblem.contestId, params.id),
        eq(table.contestProblem.problemId, params.pid),
      ),
    });
    if (!link) error(404, 'Not found');

    if (!checkRateLimit(`contest-submit:${params.id}:${locals.auth.user.id}`, SUBMIT_LIMIT, SUBMIT_WINDOW_MS)) {
      return fail(429, { message: 'Too many submissions, slow down' });
    }

    const data = await request.formData();
    const language = data.get('lang')?.toString().replace(/\r\n|\r/g, '\n');
    const code = data.get('code')?.toString().replace(/\r\n|\r/g, '\n');
    if (!code) error(400, 'No code provided');
    if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES)
      return fail(413, { message: `Code too large (max ${MAX_CODE_BYTES} bytes)` });
    let languages: { id: string; name: string }[] = [];
    try {
      languages = await getLanguages();
    } catch {
      return fail(503, { message: 'Execution service unavailable' });
    }
    if (!language || !languages.find((x) => x.id === language)) error(400, 'Invalid language');

    let submission;
    try {
      submission = await createSubmission(language, code, params.pid, locals.auth.user.id, params.id);
    } catch (e) {
      const status =
        e && typeof e === 'object' && 'status' in e && typeof (e as { status: unknown }).status === 'number'
          ? ((e as { status: number }).status as 404 | 413 | 429)
          : 500;
      if (status === 404) error(404, 'Problem not found');
      if (status === 413) return fail(413, { message: 'Code too large' });
      if (status === 429) return fail(429, { message: 'Submission queue is full, try again later' });
      console.error('Contest submission failed:', e);
      return fail(500, { message: 'Failed to create submission' });
    }
    return redirect(303, '/submission/' + submission.id);
  },
} satisfies Actions;
