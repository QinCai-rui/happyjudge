import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { assertUserExists } from '$lib/server/assertion';
import { verdictToHumanName } from '$lib/utils';
import { getLanguages } from '$lib/server/codefort';

export const load: PageServerLoad = async ({ params, locals }) => {
  assertUserExists(locals.auth);

  const { id } = params;

  const submission = await db.query.submission.findFirst({
    where: eq(table.submission.id, Number(id)),
    with: {
      problem: true,
    },
  });

  if (!submission) error(404, 'Not found');
  if (submission.userId !== locals.auth.user.id && !locals.auth.user.canAdmin) error(404, 'Not found');

  let languageName = submission.language;
  try {
    const languages = await getLanguages();
    languageName = languages.find((x) => x.id === submission.language)?.name || submission.language; // in case a language was removed
  } catch (e) {
    console.error('Failed to load Codefort languages:', e);
    // Fall back to raw language id; judging already happened.
  }

  return {
    submission: {
      id: submission.id,
      problemId: submission.problemId,
      contestId: submission.contestId,
      userId: submission.userId,
      code: submission.code,
      language: languageName,
      submittedAt: submission.submittedAt,
      results: await Promise.all(
        submission.results.map(async (x) => ({
          caseGroup: x.caseGroup,
          id: x.id,
          memoryUsed: x.memoryUsed,
          score: x.score,
          timeTaken: x.timeTaken,
          verdict: verdictToHumanName(x.verdict),
          // NO OUTPUT GIVEN (IF HIDDEN) AT ALL COSTS!! (maybe not _all_)
          // Missing testcase rows default to hidden to avoid leaking output.
          output: ((await db.query.testcase.findFirst({ where: eq(table.testcase.id, x.id) }))?.isHidden ?? true)
            ? null
            : x.output,
        })),
      ),
      problem: submission.problem,
    },
  };
};
