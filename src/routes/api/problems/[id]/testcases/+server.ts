import { eq } from 'drizzle-orm';
import { api, apiData, ApiError, pathParam, readJson, problemForOwner, requireUser } from '$lib/server/api';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

type Body = { input?: unknown; output?: unknown; caseGroup?: unknown; weight?: unknown; isHidden?: unknown };

function testcaseValues(body: Body) {
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

export const GET = (event) =>
  api(async (event) => {
    const user = await requireUser(event);
    const id = pathParam(event, 'id');
    await problemForOwner(id, user);
    const rows = await db.query.testcase.findMany({ where: eq(table.testcase.problemId, id) });
    rows.sort((a, b) => a.id - b.id);
    return apiData(rows);
  }, event);

export const POST = (event) =>
  api(async (event) => {
    const user = await requireUser(event);
    const id = pathParam(event, 'id');
    await problemForOwner(id, user);
    const values = testcaseValues(await readJson<Body>(event));
    const [row] = await db
      .insert(table.testcase)
      .values({ problemId: id, ...values })
      .returning();
    return apiData(row, 201);
  }, event);
