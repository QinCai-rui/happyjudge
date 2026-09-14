import { eq } from 'drizzle-orm';
import { generateInviteToken } from '$lib/server/contests';
import { api, apiData, findContest, pathParam, requireContestManager } from '$lib/server/api';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export const POST = (event) =>
  api(async (event) => {
    const contest = await findContest(pathParam(event, 'id'));
    await requireContestManager(event, contest);
    const inviteToken = generateInviteToken();
    await db.update(table.contest).set({ inviteToken }).where(eq(table.contest.id, contest.id));
    return apiData({ inviteToken });
  }, event);
