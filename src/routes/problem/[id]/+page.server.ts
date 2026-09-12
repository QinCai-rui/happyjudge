import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getLanguages } from '$lib/server/codefort';
import createSubmission, { MAX_CODE_BYTES } from '$lib/server/submissions';
import { assertUserExists } from '$lib/server/assertion';
import { checkRateLimit } from '$lib/server/rate-limit';

// Per-user submission throttle: 10 submissions/minute (single-process).
const SUBMIT_LIMIT = 10;
const SUBMIT_WINDOW_MS = 60_000;

export const load: PageServerLoad = async ({ params, locals }) => {
  const { id } = params;

  const problem = await db.query.problem.findFirst({
    where: eq(table.problem.id, id),
  });

  if (!problem) error(404, 'Not found');

  // Private (contest) problems are invisible by direct URL except to the
  // author and admins. Participants must go through /contest/[id]/problem/[pid].
  if (!problem.isPublic) {
    const u = locals.auth.user;
    if (!u || (!u.canAdmin && u.id !== problem.authorId)) error(404, 'Not found');
  }

  let languages: { id: string; name: string }[] = [];
  try {
    languages = await getLanguages();
  } catch (e) {
    console.error('Failed to load Codefort languages:', e);
    error(503, 'Execution service unavailable');
  }

  return { problem, languages };
};

export const actions = {
  submit: async ({ params, request, locals }) => {
    assertUserExists(locals.auth);

    // Block direct submits to private problems — contest submits go through
    // /contest/[id]/problem/[pid] so they are tagged + window-checked.
    const target = await db.query.problem.findFirst({ where: eq(table.problem.id, params.id) });
    if (!target) error(404, 'Problem not found');
    if (!target.isPublic) error(403, 'Submit via the contest page');

    if (!checkRateLimit(`submit:${locals.auth.user.id}`, SUBMIT_LIMIT, SUBMIT_WINDOW_MS)) {
      return fail(429, { message: 'Too many submissions, slow down' });
    }

    const data = await request.formData();

    const language = data
      .get('lang')
      ?.toString()
      .replace(/\r\n|\r/g, '\n');
    const code = data
      .get('code')
      ?.toString()
      .replace(/\r\n|\r/g, '\n');

    if (!code) error(400, 'No code provided');
    if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
      return fail(413, { message: `Code too large (max ${MAX_CODE_BYTES} bytes)` });
    }

    let languages: { id: string; name: string }[] = [];
    try {
      languages = await getLanguages();
    } catch {
      return fail(503, { message: 'Execution service unavailable' });
    }
    if (!language || !languages.find((x) => x.id === language)) error(400, 'Invalid language');

    let submission;
    try {
      submission = await createSubmission(language, code, params.id, locals.auth.user.id);
    } catch (e) {
      const status =
        e && typeof e === 'object' && 'status' in e && typeof (e as { status: unknown }).status === 'number'
          ? ((e as { status: number }).status as 404 | 413 | 429)
          : 500;
      if (status === 404) error(404, 'Problem not found');
      if (status === 413) return fail(413, { message: 'Code too large' });
      if (status === 429) return fail(429, { message: 'Submission queue is full, try again later' });
      console.error('Submission failed:', e);
      return fail(500, { message: 'Failed to create submission' });
    }
    return redirect(303, '/submission/' + submission.id);
  },
} satisfies Actions;
