import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { assertUserExists } from '$lib/server/assertion';
import {
  canViewContest,
  contestStatus,
  isContestManager,
  isContestParticipant,
  maybeReleaseContest,
} from '$lib/server/contests';

export const load: PageServerLoad = async ({ params, locals }) => {
  assertUserExists(locals.auth);
  const contest = await db.query.contest.findFirst({ where: eq(table.contest.id, params.id) });
  if (!contest) error(404, 'Not found');
  if (!(await canViewContest(contest, locals.auth.user, params.id))) error(404, 'Not found');

  await maybeReleaseContest(contest);

  const status = contestStatus(contest);
  const manager = await isContestManager(contest, locals.auth.user);
  const isParticipant = await isContestParticipant(contest.id, locals.auth.user.id);

  const links =
    status === 'upcoming' && !manager
      ? []
      : await db.query.contestProblem.findMany({
          where: eq(table.contestProblem.contestId, params.id),
          with: { problem: true },
        });
  links.sort((a, b) => a.position - b.position);

  // Problems hidden before start for non-managers.
  const problems = links.map((l) => l.problem);

  const participants = await db.query.contestParticipant.findMany({
    where: eq(table.contestParticipant.contestId, params.id),
  });

  return {
    contest: { ...contest, status },
    problems,
    pointsByProblem: Object.fromEntries(links.map((l) => [l.problemId, l.points])),
    participantCount: participants.length,
    isManager: manager,
    isParticipant,
  };
};

export const actions = {
  join: async ({ params, locals }) => {
    assertUserExists(locals.auth);
    const contest = await db.query.contest.findFirst({ where: eq(table.contest.id, params.id) });
    if (!contest) error(404, 'Not found');
    if (!contest.isPublic || contest.authorId === locals.auth.user.id) error(404, 'Not found');
    await db
      .insert(table.contestParticipant)
      .values({ contestId: contest.id, userId: locals.auth.user.id })
      .onConflictDoNothing();
  },
};
