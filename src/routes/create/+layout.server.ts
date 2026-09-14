import { assertUserExists } from '$lib/server/assertion';
import { isContestProblemEditor } from '$lib/server/contests';
import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  assertUserExists(event.locals.auth);
  const canManageProblem =
    event.locals.auth.user.canCreate ||
    event.locals.auth.user.canAdmin ||
    (event.params.id ? await isContestProblemEditor(event.params.id, event.locals.auth.user) : false);
  if (!canManageProblem) error(403);

  return {};
};
