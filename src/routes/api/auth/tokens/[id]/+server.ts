import { and, eq } from 'drizzle-orm';
import { api, apiData, ApiError, pathParam, requireUser } from '$lib/server/api';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export const DELETE = (event) =>
  api(async (event) => {
    const user = await requireUser(event);
    const id = pathParam(event, 'id');
    const result = await db
      .delete(table.apiToken)
      .where(and(eq(table.apiToken.id, id), eq(table.apiToken.userId, user.id)))
      .returning({ id: table.apiToken.id });
    if (!result.length) throw new ApiError(404, 'API token not found', 'not_found');
    return apiData({ deleted: true });
  }, event);
