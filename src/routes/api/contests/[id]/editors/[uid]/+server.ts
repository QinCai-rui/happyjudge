import { and, eq } from 'drizzle-orm';
import { api, apiData, ApiError, findContest, pathParam, requireContestOwner } from '$lib/server/api';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export const DELETE = (event) =>
  api(async (event) => {
    const contest = await findContest(pathParam(event, 'id'));
    await requireContestOwner(event, contest);
    const userId = pathParam(event, 'uid');
    if (userId === contest.authorId)
      throw new ApiError(400, 'The contest author is always a manager', 'validation_error');
    await db
      .delete(table.contestEditor)
      .where(and(eq(table.contestEditor.contestId, contest.id), eq(table.contestEditor.userId, userId)));
    return apiData({ deleted: true });
  }, event);
