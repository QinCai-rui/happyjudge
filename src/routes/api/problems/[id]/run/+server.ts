import { eq } from 'drizzle-orm';
import { getLanguages } from '$lib/server/codefort';
import { MAX_CODE_BYTES, MAX_STDIN_BYTES, runCustomInput } from '$lib/server/submissions';
import { checkRateLimit, CUSTOM_RUN_RATE_LIMIT, CUSTOM_RUN_RATE_WINDOW_MS } from '$lib/server/rate-limit';
import { api, apiData, ApiError, pathParam, readJson, requireUser } from '$lib/server/api';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

type Body = { language?: unknown; code?: unknown; stdin?: unknown };

export const POST = (event) =>
  api(async (event) => {
    const user = await requireUser(event);
    const problem = await db.query.problem.findFirst({ where: eq(table.problem.id, pathParam(event, 'id')) });
    if (!problem) throw new ApiError(404, 'Problem not found', 'not_found');
    if (!problem.isPublic) throw new ApiError(403, 'Run through the contest endpoint', 'forbidden');
    if (!checkRateLimit(`run:${user.id}`, CUSTOM_RUN_RATE_LIMIT, CUSTOM_RUN_RATE_WINDOW_MS))
      throw new ApiError(429, 'Too many runs, wait a moment before trying again', 'rate_limited');

    const body = await readJson<Body>(event, MAX_CODE_BYTES + MAX_STDIN_BYTES + 16 * 1024);
    if (typeof body.code !== 'string' || !body.code) throw new ApiError(400, 'code is required', 'validation_error');
    if (typeof body.stdin !== 'undefined' && typeof body.stdin !== 'string')
      throw new ApiError(400, 'stdin must be a string', 'validation_error');
    if (typeof body.language !== 'string' || !body.language)
      throw new ApiError(400, 'language is required', 'validation_error');
    if (Buffer.byteLength(body.code, 'utf8') > MAX_CODE_BYTES)
      throw new ApiError(413, `Code is too large (max ${MAX_CODE_BYTES} bytes)`, 'payload_too_large');
    const stdin = body.stdin ?? '';
    if (Buffer.byteLength(stdin, 'utf8') > MAX_STDIN_BYTES)
      throw new ApiError(413, `Input is too large (max ${MAX_STDIN_BYTES} bytes)`, 'payload_too_large');

    let languages;
    try {
      languages = await getLanguages();
    } catch {
      throw new ApiError(503, 'Execution service unavailable', 'service_unavailable');
    }
    if (!languages.some((language) => language.id === body.language))
      throw new ApiError(400, 'Invalid language', 'validation_error');
    try {
      const result = await runCustomInput(
        body.language,
        body.code.replace(/\r\n|\r/g, '\n'),
        stdin.replace(/\r\n|\r/g, '\n'),
        problem,
      );
      return apiData(result);
    } catch (e) {
      const status = e && typeof e === 'object' && 'status' in e ? Number(e.status) : 500;
      if (status === 429) throw new ApiError(429, 'Execution queue is full, try again later', 'rate_limited');
      console.error('API custom run failed:', e);
      throw new ApiError(500, 'Unable to run code', 'internal_error');
    }
  }, event);
