import { and, eq } from 'drizzle-orm';
import { getLanguages } from '$lib/server/codefort';
import createSubmission, { MAX_CODE_BYTES } from '$lib/server/submissions';
import { checkRateLimit, SUBMISSION_RATE_LIMIT, SUBMISSION_RATE_WINDOW_MS } from '$lib/server/rate-limit';
import { api, apiData, ApiError, findContest, pathParam, readJson, requireContestViewer } from '$lib/server/api';
import { isContestManager, isContestParticipant } from '$lib/server/contests';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

type Body = { language?: unknown; code?: unknown };

export const POST = (event) =>
  api(async (event) => {
    const id = pathParam(event, 'id');
    const problemId = pathParam(event, 'pid');
    const contest = await findContest(id);
    const user = await requireContestViewer(event, contest);
    if (!(await isContestManager(contest, user)) && !(await isContestParticipant(contest.id, user.id)))
      throw new ApiError(403, 'Join this contest before submitting', 'contest_join_required');
    const now = new Date();
    if (now < contest.startsAt || now > contest.endsAt)
      throw new ApiError(403, 'Submissions are closed for this contest', 'contest_window_closed');
    const link = await db.query.contestProblem.findFirst({
      where: and(eq(table.contestProblem.contestId, contest.id), eq(table.contestProblem.problemId, problemId)),
    });
    if (!link) throw new ApiError(404, 'Contest problem not found', 'not_found');
    if (!checkRateLimit(`contest-submit:${contest.id}:${user.id}`, SUBMISSION_RATE_LIMIT, SUBMISSION_RATE_WINDOW_MS))
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
    let submission;
    try {
      submission = await createSubmission(
        body.language,
        body.code.replace(/\r\n|\r/g, '\n'),
        problemId,
        user.id,
        contest.id,
      );
    } catch (e) {
      const status = e && typeof e === 'object' && 'status' in e ? Number((e as { status: unknown }).status) : 500;
      if (status === 413) throw new ApiError(413, 'Code is too large', 'payload_too_large');
      if (status === 429) throw new ApiError(429, 'Submission queue is full, try again later', 'rate_limited');
      console.error('API contest submission failed:', e);
      throw new ApiError(500, 'Failed to create submission', 'internal_error');
    }
    return apiData(
      {
        id: submission.id,
        problemId: submission.problemId,
        contestId: submission.contestId,
        submittedAt: submission.submittedAt,
        scoringVersion: submission.scoringVersion,
        results: [],
      },
      202,
    );
  }, event);
