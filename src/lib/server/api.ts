import { json, type RequestEvent } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { hashApiToken } from '$lib/server/auth';
import { contestStatus, isContestManager, isContestProblemEditor } from '$lib/server/contests';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'request_error',
  ) {
    super(message);
  }
}

type ApiHandler = (event: RequestEvent) => Response | Promise<Response>;

export async function api(handler: ApiHandler, event: RequestEvent) {
  try {
    const hasBearer = /^Bearer\s+\S+$/i.test(event.request.headers.get('authorization') ?? '');
    const origin = event.request.headers.get('origin');
    if (event.request.method !== 'GET' && event.locals.auth.user && !hasBearer && origin && origin !== event.url.origin)
      throw new ApiError(403, 'Cross-origin API request rejected', 'csrf_rejected');
    return await handler(event);
  } catch (e) {
    if (e instanceof ApiError) return apiError(e);
    console.error('API request failed:', e);
    return apiError(new ApiError(500, 'Internal server error', 'internal_error'));
  }
}

export function apiData(data: unknown, status = 200) {
  return json({ data }, { status });
}

export function apiError(error: ApiError) {
  return json({ error: { code: error.code, message: error.message } }, { status: error.status });
}

export async function readJson<T>(event: RequestEvent, maxBytes = 2 * 1024 * 1024): Promise<T> {
  const length = Number(event.request.headers.get('content-length') ?? 0);
  if (length > maxBytes) throw new ApiError(413, 'Request body is too large', 'payload_too_large');
  try {
    const text = await event.request.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes)
      throw new ApiError(413, 'Request body is too large', 'payload_too_large');
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new ApiError(400, 'Request body must be a JSON object', 'invalid_json');
    return parsed as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(400, 'Request body must be valid JSON', 'invalid_json');
  }
}

export type ApiUser = NonNullable<App.Locals['auth']['user']>;

export function pathParam(event: RequestEvent, name: string) {
  const value = (event.params as Record<string, string | undefined>)[name];
  if (!value) throw new ApiError(400, `Missing path parameter: ${name}`, 'validation_error');
  return value;
}

export async function authenticate(event: RequestEvent): Promise<ApiUser | null> {
  if (event.locals.auth.user) return event.locals.auth.user;
  const header = event.request.headers.get('authorization');
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  if (!match) return null;
  const [result] = await db
    .select({
      user: {
        id: table.user.id,
        username: table.user.username,
        canCreate: table.user.canCreate,
        canAdmin: table.user.canAdmin,
      },
      token: table.apiToken,
    })
    .from(table.apiToken)
    .innerJoin(table.user, eq(table.apiToken.userId, table.user.id))
    .where(eq(table.apiToken.tokenHash, hashApiToken(match[1])));
  if (!result || result.token.expiresAt <= new Date()) return null;
  await db.update(table.apiToken).set({ lastUsedAt: new Date() }).where(eq(table.apiToken.id, result.token.id));
  return result.user;
}

export async function requireUser(event: RequestEvent) {
  const user = await authenticate(event);
  if (!user) throw new ApiError(401, 'Authentication required');
  return user;
}

export function requireAuthoring(user: ApiUser) {
  if (!user.canCreate && !user.canAdmin) throw new ApiError(403, 'Problem and contest authoring is not enabled');
}

export function serializeUser(user: Pick<ApiUser, 'id' | 'username' | 'canCreate' | 'canAdmin'>) {
  return { id: user.id, username: user.username, canCreate: user.canCreate, canAdmin: user.canAdmin };
}

export function serializeProblem(problem: table.Problem) {
  return {
    id: problem.id,
    title: problem.title,
    statement: problem.statement,
    difficulty: problem.difficulty,
    timeLimit: problem.timeLimit,
    memoryLimit: problem.memoryLimit,
    sampleTestcases: problem.sampleTestcases,
    authorId: problem.authorId,
    createdAt: problem.createdAt,
    tags: problem.tags,
    homepage: problem.homepage,
    displayGroup: problem.displayGroup,
    isPublic: problem.isPublic,
  };
}

export function serializeContest(contest: table.Contest, includeInvite = false) {
  return {
    id: contest.id,
    title: contest.title,
    description: contest.description,
    startsAt: contest.startsAt,
    endsAt: contest.endsAt,
    isPublic: contest.isPublic,
    releaseOnEnd: contest.releaseOnEnd,
    authorId: contest.authorId,
    createdAt: contest.createdAt,
    status: contestStatus(contest),
    ...(includeInvite ? { inviteToken: contest.inviteToken } : {}),
  };
}

export async function findContest(id: string) {
  const contest = await db.query.contest.findFirst({ where: eq(table.contest.id, id) });
  if (!contest) throw new ApiError(404, 'Contest not found', 'not_found');
  return contest;
}

export async function requireContestManager(event: RequestEvent, contest: table.Contest) {
  const user = await requireUser(event);
  if (!(await isContestManager(contest, user))) throw new ApiError(403, 'Contest manager permission required');
  return user;
}

export async function requireContestOwner(event: RequestEvent, contest: table.Contest) {
  const user = await requireUser(event);
  if (!user.canAdmin && user.id !== contest.authorId) throw new ApiError(403, 'Contest owner permission required');
  return user;
}

export async function requireContestViewer(event: RequestEvent, contest: table.Contest) {
  const user = await requireUser(event);
  if (contest.isPublic) return user;
  if (!(await isContestManager(contest, user))) {
    const participant = await db.query.contestParticipant.findFirst({
      where: and(eq(table.contestParticipant.contestId, contest.id), eq(table.contestParticipant.userId, user.id)),
    });
    if (!participant) throw new ApiError(404, 'Contest not found', 'not_found');
  }
  return user;
}

export async function problemForOwner(id: string, user: ApiUser) {
  const problem = await db.query.problem.findFirst({ where: eq(table.problem.id, id) });
  if (!problem) throw new ApiError(404, 'Problem not found', 'not_found');
  if (problem.authorId !== user.id && !user.canAdmin && !(await isContestProblemEditor(problem.id, user)))
    throw new ApiError(403, 'Problem author permission required');
  return problem;
}

export function validateProblemInput(body: Record<string, unknown>, partial = false) {
  const result: Record<string, unknown> = {};
  const strings = ['title', 'statement', 'difficulty', 'displayGroup'];
  for (const key of strings) if (key in body) result[key] = typeof body[key] === 'string' ? body[key] : null;
  for (const key of ['timeLimit', 'memoryLimit']) if (key in body) result[key] = body[key];
  if ('tags' in body) result.tags = body.tags;
  if ('sampleTestcases' in body) result.sampleTestcases = body.sampleTestcases;
  if ('homepage' in body) result.homepage = body.homepage;
  if ('isPublic' in body) result.isPublic = body.isPublic;
  if (!partial && ['title', 'statement', 'difficulty', 'timeLimit', 'memoryLimit'].some((key) => !(key in result)))
    throw new ApiError(
      400,
      'title, statement, difficulty, timeLimit, and memoryLimit are required',
      'validation_error',
    );
  if (
    'title' in result &&
    (typeof result.title !== 'string' || result.title.trim().length < 3 || result.title.trim().length > 120)
  )
    throw new ApiError(400, 'Title must be 3-120 characters', 'validation_error');
  if ('statement' in result && (typeof result.statement !== 'string' || result.statement.length < 10))
    throw new ApiError(400, 'Statement must be at least 10 characters', 'validation_error');
  if ('difficulty' in result && !table.difficultyEnum.enumValues.includes(result.difficulty as never))
    throw new ApiError(400, 'Invalid difficulty', 'validation_error');
  if (
    'timeLimit' in result &&
    (!Number.isInteger(result.timeLimit) || Number(result.timeLimit) < 250 || Number(result.timeLimit) > 15000)
  )
    throw new ApiError(400, 'timeLimit must be an integer from 250 to 15000', 'validation_error');
  if (
    'memoryLimit' in result &&
    (!Number.isInteger(result.memoryLimit) || Number(result.memoryLimit) < 16 || Number(result.memoryLimit) > 2048)
  )
    throw new ApiError(400, 'memoryLimit must be an integer from 16 to 2048', 'validation_error');
  if ('tags' in result && (!Array.isArray(result.tags) || result.tags.some((x) => typeof x !== 'string')))
    throw new ApiError(400, 'tags must be an array of strings', 'validation_error');
  if (
    'sampleTestcases' in result &&
    (!Array.isArray(result.sampleTestcases) ||
      result.sampleTestcases.some((x) => typeof x?.input !== 'string' || typeof x?.output !== 'string'))
  )
    throw new ApiError(400, 'sampleTestcases must contain input/output strings', 'validation_error');
  return result;
}

export function validateDates(body: Record<string, unknown>, partial = false) {
  const result: Record<string, unknown> = {};
  for (const key of ['title', 'description', 'isPublic']) if (key in body) result[key] = body[key];
  for (const key of ['startsAt', 'endsAt']) if (key in body) result[key] = new Date(String(body[key]));
  if ('releaseOnEnd' in body) result.releaseOnEnd = body.releaseOnEnd;
  if (!partial && (!('title' in body) || !('startsAt' in body) || !('endsAt' in body)))
    throw new ApiError(400, 'title, startsAt, and endsAt are required', 'validation_error');
  if (
    'title' in result &&
    (typeof result.title !== 'string' || result.title.trim().length < 3 || result.title.trim().length > 120)
  )
    throw new ApiError(400, 'Title must be 3-120 characters', 'validation_error');
  if ('description' in result && typeof result.description !== 'string')
    throw new ApiError(400, 'Description must be a string', 'validation_error');
  if ('startsAt' in result && isNaN(+(result.startsAt as Date)))
    throw new ApiError(400, 'Invalid startsAt', 'validation_error');
  if ('endsAt' in result && isNaN(+(result.endsAt as Date)))
    throw new ApiError(400, 'Invalid endsAt', 'validation_error');
  if (result.startsAt && result.endsAt && +(result.endsAt as Date) <= +(result.startsAt as Date))
    throw new ApiError(400, 'endsAt must be after startsAt', 'validation_error');
  if ('releaseOnEnd' in result && typeof result.releaseOnEnd !== 'boolean')
    throw new ApiError(400, 'releaseOnEnd must be boolean', 'validation_error');
  if ('isPublic' in result && typeof result.isPublic !== 'boolean')
    throw new ApiError(400, 'isPublic must be boolean', 'validation_error');
  return result;
}

export async function publicContestProblems(contestId: string) {
  const links = await db.query.contestProblem.findMany({
    where: eq(table.contestProblem.contestId, contestId),
    with: { problem: true },
  });
  links.sort((a, b) => a.position - b.position);
  return links.map((link) => ({
    problemId: link.problemId,
    position: link.position,
    points: link.points,
    problem: link.problem ? serializeProblem(link.problem) : null,
  }));
}

export async function usernamesFor(ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const users = await db.query.user.findMany({ where: inArray(table.user.id, ids) });
  return new Map(users.map((u) => [u.id, u.username]));
}
