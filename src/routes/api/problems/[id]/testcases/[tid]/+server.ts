import { and, eq } from 'drizzle-orm';
import { api, apiData, ApiError, pathParam, readJson, problemForOwner, requireUser } from '$lib/server/api';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

type Body = { input?: unknown; output?: unknown; caseGroup?: unknown; weight?: unknown; isHidden?: unknown };

async function findTestcase(id: string, problemId: string) {
  const testcase = await db.query.testcase.findFirst({
    where: and(eq(table.testcase.id, Number(id)), eq(table.testcase.problemId, problemId)),
  });
  if (!testcase || !Number.isInteger(Number(id))) throw new ApiError(404, 'Testcase not found', 'not_found');
  return testcase;
}

function values(body: Body) {
  if (typeof body.input !== 'string' || typeof body.output !== 'string' || !body.output.length)
    throw new ApiError(400, 'input and a non-empty output are required', 'validation_error');
  if (body.caseGroup !== undefined && typeof body.caseGroup !== 'string')
    throw new ApiError(400, 'caseGroup must be a string', 'validation_error');
  if (!Number.isInteger(body.weight) || Number(body.weight) < 0 || Number(body.weight) > 10000)
    throw new ApiError(400, 'weight must be an integer from 0 to 10000', 'validation_error');
  if (typeof body.isHidden !== 'boolean') throw new ApiError(400, 'isHidden must be boolean', 'validation_error');
  return {
    input: body.input.replace(/\r\n|\r/g, '\n'),
    output: body.output.replace(/\r\n|\r/g, '\n'),
    caseGroup: (body.caseGroup || 'Misc').trim().slice(0, 40) || 'Misc',
    weight: body.weight as number,
    isHidden: body.isHidden,
  };
}

export const PATCH = (event) =>
  api(async (event) => {
    const user = await requireUser(event);
    const id = pathParam(event, 'id');
    const tid = pathParam(event, 'tid');
    await problemForOwner(id, user);
    await findTestcase(tid, id);
    const [row] = await db
      .update(table.testcase)
      .set(values(await readJson<Body>(event)))
      .where(eq(table.testcase.id, Number(tid)))
      .returning();
    return apiData(row);
  }, event);

export const GET = (event) =>
  api(async (event) => {
    const user = await requireUser(event);
    const id = pathParam(event, 'id');
    const tid = pathParam(event, 'tid');
    await problemForOwner(id, user);
    return apiData(await findTestcase(tid, id));
  }, event);

export const DELETE = (event) =>
  api(async (event) => {
    const user = await requireUser(event);
    const id = pathParam(event, 'id');
    const tid = pathParam(event, 'tid');
    await problemForOwner(id, user);
    await findTestcase(tid, id);
    await db.delete(table.testcase).where(eq(table.testcase.id, Number(tid)));
    return apiData({ deleted: true });
  }, event);
