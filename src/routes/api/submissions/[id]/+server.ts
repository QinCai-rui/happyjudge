import { eq, inArray } from 'drizzle-orm';
import { api, apiData, ApiError, pathParam, requireUser, serializeProblem } from '$lib/server/api';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export const GET = (event) =>
  api(async (event) => {
    const user = await requireUser(event);
    const id = Number(pathParam(event, 'id'));
    if (!Number.isInteger(id)) throw new ApiError(404, 'Submission not found', 'not_found');
    const submission = await db.query.submission.findFirst({
      where: eq(table.submission.id, id),
      with: { problem: true },
    });
    if (!submission || (submission.userId !== user.id && !user.canAdmin))
      throw new ApiError(404, 'Submission not found', 'not_found');
    const testcaseIds = submission.results.map((result) => result.id).filter((resultId) => resultId > 0);
    const testcases = testcaseIds.length
      ? await db.query.testcase.findMany({ where: inArray(table.testcase.id, testcaseIds) })
      : [];
    const hiddenById = new Map(testcases.map((testcase) => [testcase.id, testcase.isHidden]));
    return apiData({
      id: submission.id,
      problemId: submission.problemId,
      contestId: submission.contestId,
      userId: submission.userId,
      code: submission.code,
      language: submission.language,
      submittedAt: submission.submittedAt,
      scoringVersion: submission.scoringVersion,
      results: submission.results.map((result) => ({
        ...result,
        output: (hiddenById.get(result.id) ?? true) ? null : result.output,
      })),
      problem: submission.problem ? serializeProblem(submission.problem) : null,
    });
  }, event);
