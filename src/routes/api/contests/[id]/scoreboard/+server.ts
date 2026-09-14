import { api, apiData, findContest, pathParam, requireContestViewer, serializeContest } from '$lib/server/api';
import { computeScoreboard, isContestManager, maybeReleaseContest } from '$lib/server/contests';

export const GET = (event) =>
  api(async (event) => {
    const contest = await findContest(pathParam(event, 'id'));
    const user = await requireContestViewer(event, contest);
    await maybeReleaseContest(contest);
    const board = await computeScoreboard(contest.id, await isContestManager(contest, user));
    return apiData({
      contest: serializeContest(contest),
      problems: board.problems.map((link) => ({
        problemId: link.problemId,
        title: link.problem?.title ?? link.problemId,
        points: link.points,
        position: link.position,
      })),
      rows: board.rows,
    });
  }, event);
