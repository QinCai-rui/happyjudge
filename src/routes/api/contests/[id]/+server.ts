import { eq } from 'drizzle-orm';
import { isContestManager, maybeReleaseContest } from '$lib/server/contests';
import {
  api,
  apiData,
  ApiError,
  findContest,
  pathParam,
  readJson,
  requireContestManager,
  requireContestViewer,
  serializeContest,
  serializeProblem,
  validateDates,
} from '$lib/server/api';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export const GET = (event) =>
  api(async (event) => {
    const contest = await findContest(pathParam(event, 'id'));
    const user = await requireContestViewer(event, contest);
    await maybeReleaseContest(contest);
    const manager = await isContestManager(contest, user);
    const visible = manager || contestStatusForApi(contest) !== 'upcoming';
    const links = visible
      ? await db.query.contestProblem.findMany({
          where: eq(table.contestProblem.contestId, contest.id),
          with: { problem: true },
        })
      : [];
    links.sort((a, b) => a.position - b.position);
    return apiData({
      contest: serializeContest(contest, manager),
      problems: visible
        ? links.map((l) => ({
            problemId: l.problemId,
            position: l.position,
            points: l.points,
            problem: l.problem ? serializeProblem(l.problem) : null,
          }))
        : [],
    });
  }, event);

export const PATCH = (event) =>
  api(async (event) => {
    const contest = await findContest(pathParam(event, 'id'));
    await requireContestManager(event, contest);
    const details = validateDates(await readJson<Record<string, unknown>>(event), true);
    const startsAt = (details.startsAt as Date | undefined) ?? contest.startsAt;
    const endsAt = (details.endsAt as Date | undefined) ?? contest.endsAt;
    if (endsAt <= startsAt) throw new ApiError(400, 'endsAt must be after startsAt', 'validation_error');
    const update = {
      ...details,
      ...(details.title ? { title: String(details.title).trim() } : {}),
      ...(details.description !== undefined ? { description: String(details.description).trim().slice(0, 4000) } : {}),
      startsAt,
      endsAt,
    };
    await db.update(table.contest).set(update).where(eq(table.contest.id, contest.id));
    const updated = await findContest(contest.id);
    await maybeReleaseContest(updated);
    return apiData(serializeContest(updated, true));
  }, event);

export const DELETE = (event) =>
  api(async (event) => {
    const contest = await findContest(pathParam(event, 'id'));
    const user = await requireContestManager(event, contest);
    if (!user.canAdmin && user.id !== contest.authorId) throw new ApiError(403, 'Contest owner permission required');
    await db.delete(table.contest).where(eq(table.contest.id, contest.id));
    return apiData({ deleted: true });
  }, event);

// Keep the route's response independent of the page-only helper imports.
function contestStatusForApi(contest: { startsAt: Date; endsAt: Date }) {
  const now = new Date();
  return now < contest.startsAt ? 'upcoming' : now > contest.endsAt ? 'ended' : 'live';
}
