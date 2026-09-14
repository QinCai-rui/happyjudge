import { and, desc, eq } from 'drizzle-orm';
import { slugifyProblemId } from '$lib/server/contests';
import {
  api,
  apiData,
  readJson,
  requireAuthoring,
  requireUser,
  serializeProblem,
  validateProblemInput,
} from '$lib/server/api';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export const GET = (event) =>
  api(async (event) => {
    const user = await requireUser(event);
    const mine = event.url.searchParams.get('mine') === 'true';
    const homepage = event.url.searchParams.get('homepage') === 'true';
    const rows = homepage
      ? await db.query.problem.findMany({
          where: and(eq(table.problem.homepage, true), eq(table.problem.isPublic, true)),
          orderBy: [desc(table.problem.createdAt)],
          limit: 80,
        })
      : mine || user.canAdmin
        ? await db.query.problem.findMany({
            where: mine ? eq(table.problem.authorId, user.id) : undefined,
            orderBy: [desc(table.problem.createdAt)],
            limit: 100,
          })
        : await db.query.problem.findMany({
            where: eq(table.problem.isPublic, true),
            orderBy: [desc(table.problem.createdAt)],
            limit: 100,
          });
    return apiData(rows.map(serializeProblem));
  }, event);

export const POST = (event) =>
  api(async (event) => {
    const user = await requireUser(event);
    requireAuthoring(user);
    const body = validateProblemInput(await readJson<Record<string, unknown>>(event));
    const title = String(body.title).trim();
    const tags =
      (body.tags as string[] | undefined)
        ?.map((tag) => tag.trim().slice(0, 24))
        .filter(Boolean)
        .slice(0, 12) ?? [];
    const id = slugifyProblemId(title);
    const problem = {
      id,
      title,
      statement: String(body.statement).replace(/\r\n|\r/g, '\n'),
      difficulty: body.difficulty as table.DifficultyEnum[number],
      timeLimit: body.timeLimit as number,
      memoryLimit: body.memoryLimit as number,
      sampleTestcases: (body.sampleTestcases ?? []) as { input: string; output: string }[],
      authorId: user.id,
      tags,
      homepage: user.canAdmin ? Boolean(body.homepage ?? false) : false,
      displayGroup: body.displayGroup ? String(body.displayGroup).trim().slice(0, 120) : null,
      isPublic: Boolean(body.isPublic ?? true),
    };
    await db.insert(table.problem).values(problem);
    return apiData(serializeProblem({ ...problem, createdAt: new Date() }), 201);
  }, event);
