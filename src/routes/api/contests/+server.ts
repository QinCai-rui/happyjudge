import { desc, eq } from 'drizzle-orm';
import { generateContestId, generateInviteToken } from '$lib/server/contests';
import {
  api,
  apiData,
  readJson,
  requireAuthoring,
  requireUser,
  serializeContest,
  validateDates,
} from '$lib/server/api';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export const GET = (event) =>
  api(async (event) => {
    const user = await requireUser(event);
    const own = user.canAdmin
      ? await db.query.contest.findMany({ orderBy: [desc(table.contest.startsAt)], limit: 100 })
      : await db.query.contest.findMany({
          where: eq(table.contest.authorId, user.id),
          orderBy: [desc(table.contest.startsAt)],
          limit: 100,
        });
    const participating = await db.query.contestParticipant.findMany({
      where: eq(table.contestParticipant.userId, user.id),
    });
    const editorGrants = await db.query.contestEditor.findMany({ where: eq(table.contestEditor.userId, user.id) });
    const editorIds = new Set(editorGrants.map((grant) => grant.contestId));
    const ids = [...participating.map((p) => p.contestId), ...editorGrants.map((grant) => grant.contestId)].filter(
      (id) => !own.some((c) => c.id === id),
    );
    const joined = ids.length
      ? await db.query.contest.findMany({ where: (c, { inArray }) => inArray(c.id, ids), limit: 100 })
      : [];
    const all = [...own, ...joined];
    return apiData(
      all
        .sort((a, b) => +b.startsAt - +a.startsAt)
        .map((c) => serializeContest(c, user.canAdmin || c.authorId === user.id || editorIds.has(c.id))),
    );
  }, event);

export const POST = (event) =>
  api(async (event) => {
    const user = await requireUser(event);
    requireAuthoring(user);
    const body = await readJson<Record<string, unknown>>(event);
    const details = validateDates(body);
    const id = generateContestId();
    const contest = {
      id,
      title: String(details.title).trim(),
      description: String(details.description ?? '')
        .trim()
        .slice(0, 4000),
      startsAt: details.startsAt as Date,
      endsAt: details.endsAt as Date,
      inviteToken: generateInviteToken(),
      authorId: user.id,
      releaseOnEnd: Boolean(details.releaseOnEnd ?? false),
    };
    await db.insert(table.contest).values(contest);
    await db.insert(table.contestParticipant).values({ contestId: id, userId: user.id });
    return apiData(serializeContest({ ...contest, createdAt: new Date() }, true), 201);
  }, event);
