import { and, eq } from 'drizzle-orm';
import { api, apiData, ApiError, findContest, pathParam, readJson, requireContestManager } from '$lib/server/api';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export const DELETE = (event) =>
  api(async (event) => {
    const contest = await findContest(pathParam(event, 'id'));
    const problemId = pathParam(event, 'pid');
    await requireContestManager(event, contest);
    const result = await db
      .delete(table.contestProblem)
      .where(and(eq(table.contestProblem.contestId, contest.id), eq(table.contestProblem.problemId, problemId)))
      .returning({
        problemId: table.contestProblem.problemId,
        originalIsPublic: table.contestProblem.originalIsPublic,
      });
    if (!result.length) throw new ApiError(404, 'Contest problem not found', 'not_found');
    const remaining = await db.query.contestProblem.findFirst({ where: eq(table.contestProblem.problemId, problemId) });
    if (!remaining)
      await db
        .update(table.problem)
        .set({ isPublic: result[0].originalIsPublic ?? true })
        .where(eq(table.problem.id, problemId));
    return apiData({ deleted: true });
  }, event);

export const PATCH = (event) =>
  api(async (event) => {
    const contest = await findContest(pathParam(event, 'id'));
    await requireContestManager(event, contest);
    const problemId = pathParam(event, 'pid');
    const body = await readJson<{ points?: unknown; position?: unknown }>(event, 16 * 1024);
    const update: { points?: number; position?: number } = {};
    if (body.points !== undefined) {
      if (!Number.isInteger(body.points) || Number(body.points) <= 0 || Number(body.points) > 10000)
        throw new ApiError(400, 'points must be an integer from 1 to 10000', 'validation_error');
      update.points = Number(body.points);
    }
    if (body.position !== undefined) {
      if (!Number.isInteger(body.position) || Number(body.position) < 0)
        throw new ApiError(400, 'position must be a non-negative integer', 'validation_error');
      update.position = Number(body.position);
    }
    if (!Object.keys(update).length) throw new ApiError(400, 'points or position is required', 'validation_error');
    const [link] = await db
      .update(table.contestProblem)
      .set(update)
      .where(and(eq(table.contestProblem.contestId, contest.id), eq(table.contestProblem.problemId, problemId)))
      .returning();
    if (!link) throw new ApiError(404, 'Contest problem not found', 'not_found');
    return apiData(link);
  }, event);
