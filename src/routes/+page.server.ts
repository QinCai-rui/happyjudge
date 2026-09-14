import * as auth from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.auth.user) {
    return redirect(302, '/login');
  }

  const problems = await db.query.problem.findMany({
    where: and(eq(table.problem.homepage, true), eq(table.problem.isPublic, true)),
    limit: 80, // only 80 at once
  });

  const attempts = problems.length
    ? await db.query.submission.findMany({
        where: and(
          eq(table.submission.userId, locals.auth.user.id),
          inArray(
            table.submission.problemId,
            problems.map((problem) => problem.id),
          ),
        ),
        columns: { problemId: true, results: true },
      })
    : [];

  const progress = Object.fromEntries(
    problems.map((problem) => {
      const submissions = attempts.filter((attempt) => attempt.problemId === problem.id);
      const solved = submissions.some(
        (attempt) => attempt.results.length > 0 && attempt.results.every((result) => result.verdict === 'accepted'),
      );
      return [problem.id, solved ? 'solved' : submissions.length ? 'attempted' : 'unattempted'];
    }),
  );

  return { user: locals.auth.user, problems, progress };
};

export const actions: Actions = {
  // This is here because the action cannot go in the layout.server.ts file
  logout: async (event) => {
    if (!event.locals.auth.session) {
      return fail(401);
    }
    await auth.invalidateSession(event.locals.auth.session.id);
    auth.deleteSessionTokenCookie(event);

    return redirect(302, '/login');
  },
};
