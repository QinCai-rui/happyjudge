import { and, eq } from 'drizzle-orm';
import { api, apiData, ApiError, findContest, pathParam, requireContestManager } from '$lib/server/api';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export const DELETE = (event) =>
  api(async (event) => {
    const contest = await findContest(pathParam(event, 'id'));
    const userId = pathParam(event, 'uid');
    await requireContestManager(event, contest);
    if (userId === contest.authorId) throw new ApiError(400, 'Cannot remove the contest author', 'validation_error');
    await db
      .delete(table.contestParticipant)
      .where(and(eq(table.contestParticipant.contestId, contest.id), eq(table.contestParticipant.userId, userId)));
    return apiData({ deleted: true });
  }, event);
