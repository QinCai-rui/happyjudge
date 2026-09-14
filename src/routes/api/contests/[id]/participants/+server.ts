import { eq } from 'drizzle-orm';
import {
  api,
  apiData,
  ApiError,
  findContest,
  pathParam,
  readJson,
  requireContestManager,
  usernamesFor,
} from '$lib/server/api';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

type Body = { username?: unknown };

export const GET = (event) =>
  api(async (event) => {
    const contest = await findContest(pathParam(event, 'id'));
    await requireContestManager(event, contest);
    const rows = await db.query.contestParticipant.findMany({
      where: eq(table.contestParticipant.contestId, contest.id),
    });
    const names = await usernamesFor(rows.map((row) => row.userId));
    return apiData(rows.map((row) => ({ ...row, username: names.get(row.userId) ?? row.userId })));
  }, event);

export const POST = (event) =>
  api(async (event) => {
    const contest = await findContest(pathParam(event, 'id'));
    await requireContestManager(event, contest);
    const body = await readJson<Body>(event, 16 * 1024);
    if (typeof body.username !== 'string' || !body.username.trim())
      throw new ApiError(400, 'username is required', 'validation_error');
    const invited = await db.query.user.findFirst({ where: eq(table.user.username, body.username.trim()) });
    // Do not turn this endpoint into a username enumeration oracle.
    if (invited)
      await db
        .insert(table.contestParticipant)
        .values({ contestId: contest.id, userId: invited.id })
        .onConflictDoNothing();
    return apiData({ message: 'If that user exists, they were invited.' });
  }, event);
