import { and, eq, inArray } from 'drizzle-orm';
import { api, apiData, requireUser } from '$lib/server/api';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export const GET = (event) =>
  api(async (event) => {
    const user = await requireUser(event);
    const ids = [...new Set(event.url.searchParams.getAll('id').filter(Boolean))].slice(0, 100);
    const problems = await db.query.problem.findMany({
      where: ids.length
        ? and(eq(table.problem.isPublic, true), inArray(table.problem.id, ids))
        : eq(table.problem.isPublic, true),
      columns: { id: true },
      limit: ids.length ? ids.length : 100,
    });
    const problemIds = problems.map((problem) => problem.id);
    const submissions = problemIds.length
      ? await db.query.submission.findMany({
          where: and(eq(table.submission.userId, user.id), inArray(table.submission.problemId, problemIds)),
          columns: { problemId: true, results: true },
        })
      : [];

    return apiData(
      Object.fromEntries(
        problemIds.map((problemId) => {
          const attempts = submissions.filter((submission) => submission.problemId === problemId);
          const solved = attempts.some(
            (submission) =>
              submission.results.length > 0 && submission.results.every((result) => result.verdict === 'accepted'),
          );
          return [problemId, solved ? 'solved' : attempts.length ? 'attempted' : 'unattempted'];
        }),
      ),
    );
  }, event);
