import { eq } from 'drizzle-orm';
import { getLanguages } from '$lib/server/codefort';
import createSubmission, { MAX_CODE_BYTES } from '$lib/server/submissions';
import { checkRateLimit, SUBMISSION_RATE_LIMIT, SUBMISSION_RATE_WINDOW_MS } from '$lib/server/rate-limit';
import { api, apiData, ApiError, pathParam, readJson, requireUser } from '$lib/server/api';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

type Body = { language?: unknown; code?: unknown };

export const POST = (event) =>
  api(async (event) => {
    const user = await requireUser(event);
    const problem = await db.query.problem.findFirst({ where: eq(table.problem.id, pathParam(event, 'id')) });
    if (!problem) throw new ApiError(404, 'Problem not found', 'not_found');
    if (!problem.isPublic) throw new ApiError(403, 'Submit through the contest endpoint', 'forbidden');
    if (!checkRateLimit(`submit:${user.id}`, SUBMISSION_RATE_LIMIT, SUBMISSION_RATE_WINDOW_MS))
      throw new ApiError(429, 'Too many submissions, slow down', 'rate_limited');
    const body = await readJson<Body>(event, MAX_CODE_BYTES + 16 * 1024);
    if (typeof body.code !== 'string' || !body.code) throw new ApiError(400, 'code is required', 'validation_error');
    if (Buffer.byteLength(body.code, 'utf8') > MAX_CODE_BYTES)
      throw new ApiError(413, `Code is too large (max ${MAX_CODE_BYTES} bytes)`, 'payload_too_large');
    if (typeof body.language !== 'string' || !body.language)
      throw new ApiError(400, 'language is required', 'validation_error');
    let languages;
    try {
      languages = await getLanguages();
    } catch {
      throw new ApiError(503, 'Execution service unavailable', 'service_unavailable');
    }
    if (!languages.some((language) => language.id === body.language))
      throw new ApiError(400, 'Invalid language', 'validation_error');
    const submission = await makeSubmission(body.language, body.code, problem.id, user.id);
    return apiData(
      {
        id: submission.id,
        problemId: submission.problemId,
        contestId: null,
        submittedAt: submission.submittedAt,
        scoringVersion: submission.scoringVersion,
        results: [],
      },
      202,
    );
  }, event);

async function makeSubmission(language: string, code: string, problemId: string, userId: string) {
  try {
    return await createSubmission(language, code.replace(/\r\n|\r/g, '\n'), problemId, userId);
  } catch (e) {
    const status = e && typeof e === 'object' && 'status' in e ? Number((e as { status: unknown }).status) : 500;
    if (status === 413) throw new ApiError(413, 'Code is too large', 'payload_too_large');
    if (status === 429) throw new ApiError(429, 'Submission queue is full, try again later', 'rate_limited');
    console.error('API submission failed:', e);
    throw new ApiError(500, 'Failed to create submission', 'internal_error');
  }
}
