import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { assertUserExists } from '$lib/server/assertion';
import { verdictToHumanName } from '$lib/utils';
import { getDisplaySubmissionScores } from '$lib/server/submissions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  assertUserExists(locals.auth);

  const submissions = await db.query.submission.findMany({
    where: eq(table.submission.userId, locals.auth.user.id),
    with: { problem: true },
    orderBy: [desc(table.submission.submittedAt), desc(table.submission.id)],
    limit: 100,
  });
  const displayScores = await getDisplaySubmissionScores(submissions);

  return {
    submissions: submissions.map((submission) => {
      const pending = submission.results.length === 0;
      const accepted = !pending && submission.results.every((result) => result.verdict === 'accepted');
      const firstFailure = submission.results.find((result) => result.verdict !== 'accepted');

      return {
        id: submission.id,
        problemId: submission.problemId,
        problemTitle: submission.problem?.title ?? submission.problemId,
        contestId: submission.contestId,
        language: submission.language,
        submittedAt: submission.submittedAt,
        state: pending ? 'pending' : accepted ? 'accepted' : 'failed',
        verdict: pending
          ? 'Judging'
          : accepted
            ? 'Accepted'
            : firstFailure
              ? verdictToHumanName(firstFailure.verdict)
              : 'Finished',
        score: displayScores.get(submission.id)?.total ?? 0,
        scoreMaximum: displayScores.get(submission.id)?.maximum ?? 0,
      };
    }),
  };
};
