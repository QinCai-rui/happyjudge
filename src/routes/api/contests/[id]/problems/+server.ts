import { and, eq } from 'drizzle-orm';
import { isContestEditor, isContestManager } from '$lib/server/contests';
import {
  api,
  apiData,
  ApiError,
  findContest,
  pathParam,
  readJson,
  requireContestManager,
  requireContestViewer,
  serializeProblem,
} from '$lib/server/api';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

type Body = { problemId?: unknown; points?: unknown; position?: unknown };

export const GET = (event) =>
  api(async (event) => {
    const contest = await findContest(pathParam(event, 'id'));
    const user = await requireContestViewer(event, contest);
    const manager = await isContestManager(contest, user);
    if (!manager && new Date() < contest.startsAt) return apiData([]);
    const links = await db.query.contestProblem.findMany({
      where: eq(table.contestProblem.contestId, contest.id),
      with: { problem: true },
    });
    links.sort((a, b) => a.position - b.position);
    return apiData(
      links.map((l) => ({
        problemId: l.problemId,
        position: l.position,
        points: l.points,
        problem: l.problem ? serializeProblem(l.problem) : null,
      })),
    );
  }, event);

export const POST = (event) =>
  api(async (event) => {
    const contest = await findContest(pathParam(event, 'id'));
    const user = await requireContestManager(event, contest);
    const body = await readJson<Body>(event);
    if (typeof body.problemId !== 'string' || !body.problemId.trim())
      throw new ApiError(400, 'problemId is required', 'validation_error');
    if (!Number.isInteger(body.points) || Number(body.points) <= 0 || Number(body.points) > 10000)
      throw new ApiError(400, 'points must be an integer from 1 to 10000', 'validation_error');
    const problemId = body.problemId.trim();
    const problem = await db.query.problem.findFirst({ where: eq(table.problem.id, problemId) });
    if (!problem) throw new ApiError(404, 'Problem not found', 'not_found');
    if (!user.canAdmin && problem.authorId !== user.id && !(await isContestEditor(contest.id, user.id)))
      throw new ApiError(403, 'You cannot add this problem');
    const existing = await db.query.contestProblem.findMany({ where: eq(table.contestProblem.contestId, contest.id) });
    const position = body.position === undefined ? existing.length : body.position;
    if (!Number.isInteger(position) || Number(position) < 0)
      throw new ApiError(400, 'position must be a non-negative integer', 'validation_error');
    const [link] = await db
      .insert(table.contestProblem)
      .values({
        contestId: contest.id,
        problemId,
        position: Number(position),
        points: Number(body.points),
        originalIsPublic: problem.isPublic,
      })
      .onConflictDoNothing()
      .returning();
    if (!link) throw new ApiError(409, 'Problem is already in this contest', 'conflict');
    await db.update(table.problem).set({ isPublic: false }).where(eq(table.problem.id, problemId));
    return apiData({ ...link, problem: serializeProblem(problem) }, 201);
  }, event);
