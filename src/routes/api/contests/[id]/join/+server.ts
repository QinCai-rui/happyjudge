import { and, eq } from 'drizzle-orm';
import { checkRateLimit } from '$lib/server/rate-limit';
import {
  api,
  apiData,
  ApiError,
  findContest,
  pathParam,
  readJson,
  requireUser,
  serializeContest,
} from '$lib/server/api';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

type Body = { inviteToken?: unknown };

export const POST = (event) =>
  api(async (event) => {
    const user = await requireUser(event);
    const id = pathParam(event, 'id');
    if (!checkRateLimit(`contest-join:${id}:${user.id}`, 10, 60_000))
      throw new ApiError(429, 'Too many join attempts, try again later', 'rate_limited');
    const body = await readJson<Body>(event, 16 * 1024);
    if (typeof body.inviteToken !== 'string' || !body.inviteToken)
      throw new ApiError(400, 'inviteToken is required', 'validation_error');
    const contest = await db.query.contest.findFirst({
      where: and(eq(table.contest.id, id), eq(table.contest.inviteToken, body.inviteToken)),
    });
    if (!contest) throw new ApiError(404, 'Invite link is invalid or expired', 'not_found');
    await db.insert(table.contestParticipant).values({ contestId: contest.id, userId: user.id }).onConflictDoNothing();
    return apiData({ contest: serializeContest(contest), joined: true });
  }, event);
