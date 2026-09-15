import { and, desc, eq } from 'drizzle-orm';
import { api, apiData, requireUser } from '$lib/server/api';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { verdictToHumanName } from '$lib/utils';
import { getDisplaySubmissionScores } from '$lib/server/submissions';

export const GET = (event) =>
  api(async (event) => {
    const user = await requireUser(event);
    const problemId = event.url.searchParams.get('problemId');
    const contestId = event.url.searchParams.get('contestId');
    const rawLimit = Number(event.url.searchParams.get('limit') ?? 100);
    const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 100;
    const filters = [eq(table.submission.userId, user.id)];
    if (problemId) filters.push(eq(table.submission.problemId, problemId));
    if (contestId) filters.push(eq(table.submission.contestId, contestId));

    const submissions = await db.query.submission.findMany({
      where: and(...filters),
      with: { problem: true },
      orderBy: [desc(table.submission.submittedAt), desc(table.submission.id)],
      limit,
    });
    const displayScores = await getDisplaySubmissionScores(submissions);

    return apiData(
      submissions.map((submission) => {
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
          scoringVersion: submission.scoringVersion,
          state: pending ? 'pending' : accepted ? 'accepted' : 'failed',
          verdict: pending
            ? null
            : accepted
              ? 'Accepted'
              : firstFailure
                ? verdictToHumanName(firstFailure.verdict)
                : 'Finished',
          score: displayScores.get(submission.id)?.total ?? 0,
          scoreMaximum: displayScores.get(submission.id)?.maximum ?? 0,
        };
      }),
    );
  }, event);
