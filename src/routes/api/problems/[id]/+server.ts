import { eq } from 'drizzle-orm';
import {
  api,
  apiData,
  ApiError,
  pathParam,
  readJson,
  requireUser,
  problemForOwner,
  serializeProblem,
  validateProblemInput,
} from '$lib/server/api';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { isContestProblemEditor } from '$lib/server/contests';

export const GET = (event) =>
  api(async (event) => {
    const user = await requireUser(event);
    const id = pathParam(event, 'id');
    const problem = await db.query.problem.findFirst({ where: eq(table.problem.id, id) });
    if (!problem) throw new ApiError(404, 'Problem not found', 'not_found');
    if (
      !problem.isPublic &&
      problem.authorId !== user.id &&
      !user.canAdmin &&
      !(await isContestProblemEditor(problem.id, user))
    )
      throw new ApiError(404, 'Problem not found', 'not_found');
    return apiData(serializeProblem(problem));
  }, event);

export const PATCH = (event) =>
  api(async (event) => {
    const user = await requireUser(event);
    const id = pathParam(event, 'id');
    const problem = await problemForOwner(id, user);
    const body = validateProblemInput(await readJson<Record<string, unknown>>(event), true);
    if (!user.canAdmin) {
      delete body.homepage;
      if (problem.authorId !== user.id) delete body.isPublic;
    }
    if ('title' in body) body.title = String(body.title).trim();
    if ('statement' in body) body.statement = String(body.statement).replace(/\r\n|\r/g, '\n');
    if ('tags' in body)
      body.tags = (body.tags as string[])
        .map((tag) => tag.trim().slice(0, 24))
        .filter(Boolean)
        .slice(0, 12);
    if ('displayGroup' in body)
      body.displayGroup = body.displayGroup ? String(body.displayGroup).trim().slice(0, 120) : null;
    await db
      .update(table.problem)
      .set(body as Partial<table.Problem>)
      .where(eq(table.problem.id, problem.id));
    const updated = await db.query.problem.findFirst({ where: eq(table.problem.id, problem.id) });
    return apiData(serializeProblem(updated!));
  }, event);

export const DELETE = (event) =>
  api(async (event) => {
    const user = await requireUser(event);
    const id = pathParam(event, 'id');
    const problem = await problemForOwner(id, user);
    if (!user.canAdmin && problem.authorId !== user.id) throw new ApiError(403, 'Problem author permission required');
    const linked = await db.query.contestProblem.findFirst({
      where: eq(table.contestProblem.problemId, id),
    });
    if (linked) throw new ApiError(409, 'Remove the problem from contests first', 'conflict');
    await db.delete(table.problem).where(eq(table.problem.id, id));
    return apiData({ deleted: true });
  }, event);
