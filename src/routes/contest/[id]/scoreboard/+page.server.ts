import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { assertUserExists } from '$lib/server/assertion';
import { canViewContest, computeScoreboard, contestStatus, maybeReleaseContest } from '$lib/server/contests';

export const load: PageServerLoad = async ({ params, locals }) => {
  assertUserExists(locals.auth);
  const contest = await db.query.contest.findFirst({ where: eq(table.contest.id, params.id) });
  if (!contest) error(404, 'Not found');
  if (!(await canViewContest(contest, locals.auth.user, params.id))) error(404, 'Not found');
  await maybeReleaseContest(contest);
  const board = await computeScoreboard(params.id);
  return {
    contest: { ...contest, status: contestStatus(contest) },
    board: {
      problems: board.problems.map((l) => ({
        problemId: l.problemId,
        title: l.problem?.title ?? l.problemId,
        points: l.points,
        position: l.position,
      })),
      rows: board.rows,
    },
  };
};
