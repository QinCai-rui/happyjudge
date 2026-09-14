import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getLanguages } from '$lib/server/codefort';
import createSubmission, { MAX_CODE_BYTES, MAX_STDIN_BYTES, runCustomInput } from '$lib/server/submissions';
import { assertUserExists } from '$lib/server/assertion';
import {
  checkRateLimit,
  CUSTOM_RUN_RATE_LIMIT,
  CUSTOM_RUN_RATE_WINDOW_MS,
  SUBMISSION_RATE_LIMIT,
  SUBMISSION_RATE_WINDOW_MS,
} from '$lib/server/rate-limit';
import { isContestProblemEditor } from '$lib/server/contests';

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
    if (!u || (!u.canAdmin && u.id !== problem.authorId && !(await isContestProblemEditor(problem.id, u))))
      error(404, 'Not found');
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
  run: async ({ params, request, locals }) => {
    assertUserExists(locals.auth);
    if (!checkRateLimit(`run:${locals.auth.user.id}`, CUSTOM_RUN_RATE_LIMIT, CUSTOM_RUN_RATE_WINDOW_MS)) {
      return fail(429, { message: 'Too many runs, wait a moment before trying again' });
    }

    const problem = await db.query.problem.findFirst({ where: eq(table.problem.id, params.id) });
    if (!problem || !problem.isPublic) error(404, 'Problem not found');
    const data = await request.formData();
    const language = data.get('lang')?.toString();
    const code = data
      .get('code')
      ?.toString()
      .replace(/\r\n|\r/g, '\n');
    const stdin =
      data
        .get('stdin')
        ?.toString()
        .replace(/\r\n|\r/g, '\n') ?? '';
    if (!code) return fail(400, { message: 'Add some code before running it' });
    if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES)
      return fail(413, { message: `Code too large (max ${MAX_CODE_BYTES} bytes)` });
    if (Buffer.byteLength(stdin, 'utf8') > MAX_STDIN_BYTES)
      return fail(413, { message: `Input too large (max ${MAX_STDIN_BYTES} bytes)` });

    let languages: { id: string; name: string }[];
    try {
      languages = await getLanguages();
    } catch {
      return fail(503, { message: 'Execution service unavailable' });
    }
    if (!language || !languages.some((item) => item.id === language)) return fail(400, { message: 'Invalid language' });

    try {
      const result = await runCustomInput(language, code, stdin, problem);
      return {
        runResult: {
          stdout: result.stdout.slice(0, MAX_STDIN_BYTES),
          stderr: result.stderr.slice(0, MAX_STDIN_BYTES),
          exitCode: result.exitCode,
          timeTaken: result.stats.run.realTime,
          compileError: result.stats.compile?.stderr.slice(0, MAX_STDIN_BYTES) ?? '',
        },
      };
    } catch (e) {
      console.error('Custom run failed:', e);
      const status = e && typeof e === 'object' && 'status' in e ? Number(e.status) : 500;
      return fail(status === 429 ? 429 : 500, {
        message: status === 429 ? 'Execution queue is full, try again later' : 'Unable to run code',
      });
    }
  },
  submit: async ({ params, request, locals }) => {
    assertUserExists(locals.auth);

    // Block direct submits to private problems — contest submits go through
    // /contest/[id]/problem/[pid] so they are tagged + window-checked.
    const target = await db.query.problem.findFirst({ where: eq(table.problem.id, params.id) });
    if (!target) error(404, 'Problem not found');
    if (!target.isPublic) error(403, 'Submit via the contest page');

    if (!checkRateLimit(`submit:${locals.auth.user.id}`, SUBMISSION_RATE_LIMIT, SUBMISSION_RATE_WINDOW_MS)) {
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
