import { relations, sql } from 'drizzle-orm';
import { pgTable, pgEnum, text, timestamp, integer, serial, jsonb, boolean, primaryKey } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  canCreate: boolean('can_create').default(false).notNull(),
  canAdmin: boolean('can_admin').default(false).notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
  submission: many(submission),
  contestEditors: many(contestEditor),
}));

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
});

export const apiToken = pgTable('api_token', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const difficultyEnum = pgEnum('difficulty', ['easy', 'medium', 'hard', 'expert', 'insane']);

export const problem = pgTable('problem', {
  id: text('id')
    .primaryKey()
    .default(sql`nextval('problem_id_seq')::text`),
  title: text('title').notNull(),
  statement: text('statement').notNull(),
  difficulty: difficultyEnum('difficulty').notNull(),
  timeLimit: integer('time_limit').notNull(), // in milliseconds
  memoryLimit: integer('memory_limit').notNull(), // in megabytes
  sampleTestcases: jsonb('sample_testcases').notNull().$type<{ input: string; output: string }[]>(),
  authorId: text('author_id')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // TODO: One to many access (first TODO groups)
  tags: jsonb('tags').$type<string[]>().notNull(),
  homepage: boolean('homepage').default(false).notNull(), // whether to show on homepage,
  displayGroup: text('display_group'), // if the problem should be shown in a collapsible group in the UI
  isPublic: boolean('is_public').default(true).notNull(), // false = contest-private until released
});

export const problemRelations = relations(problem, ({ many }) => ({
  submission: many(submission),
}));

export const testcase = pgTable('testcase', {
  id: serial('id').primaryKey(),
  problemId: text('problem_id')
    .notNull()
    .references(() => problem.id, {
      onDelete: 'cascade',
    }),
  input: text('input').notNull(),
  output: text('output').notNull(),
  isHidden: boolean('is_hidden').default(true).notNull(),
  caseGroup: text('testcase_group').default('Misc').notNull(),
  weight: integer('weight').default(1).notNull(), // contributes to its subtask's points
});

export type Verdict =
  | 'accepted'
  | 'wrong_answer'
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded'
  | 'runtime_error'
  | 'compilation_error';

export type Result = {
  id: number;
  caseGroup: string;
  output: string;
  timeTaken: number; // in milliseconds
  memoryUsed: number; // in megabytes
  verdict: Verdict;
  score: number;
};

export const caseGroupAllOrNothingV1 = 'case_group_all_or_nothing_v1';
export type ScoringVersion = typeof caseGroupAllOrNothingV1;

export const submission = pgTable('submission', {
  id: serial('id').primaryKey(),
  problemId: text('problem_id')
    .notNull()
    .references(() => problem.id),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  code: text('code').notNull(),
  language: text('language').notNull(),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  results: jsonb('results').$type<Result[]>().notNull().default([]), // type checks done in typescript, not postgres
  scoreNormalizationTotal: integer('score_normalization_total'),
  scoringVersion: text('scoring_version').$type<ScoringVersion>(),
  contestId: text('contest_id').references(() => contest.id, { onDelete: 'set null' }),
});

export const submissionRelations = relations(submission, ({ one }) => ({
  user: one(user, {
    fields: [submission.userId],
    references: [user.id],
  }),
  problem: one(problem, {
    fields: [submission.problemId],
    references: [problem.id],
  }),
}));

// TODO: Group

export const contest = pgTable('contest', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  startsAt: timestamp('starts_at', { withTimezone: true, mode: 'date' }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true, mode: 'date' }).notNull(),
  inviteToken: text('invite_token').unique(),
  authorId: text('author_id')
    .notNull()
    .references(() => user.id),
  isPublic: boolean('is_public').default(false).notNull(),
  releaseOnEnd: boolean('release_on_end').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const contestRelations = relations(contest, ({ many }) => ({
  problems: many(contestProblem),
  participants: many(contestParticipant),
  editors: many(contestEditor),
}));

export const contestProblem = pgTable(
  'contest_problem',
  {
    contestId: text('contest_id')
      .notNull()
      .references(() => contest.id, { onDelete: 'cascade' }),
    problemId: text('problem_id')
      .notNull()
      .references(() => problem.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    points: integer('points').notNull().default(100),
    originalIsPublic: boolean('original_is_public'),
  },
  (t) => [primaryKey({ columns: [t.contestId, t.problemId] })],
);

export const contestProblemRelations = relations(contestProblem, ({ one }) => ({
  contest: one(contest, { fields: [contestProblem.contestId], references: [contest.id] }),
  problem: one(problem, { fields: [contestProblem.problemId], references: [problem.id] }),
}));

export const contestParticipant = pgTable(
  'contest_participant',
  {
    contestId: text('contest_id')
      .notNull()
      .references(() => contest.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    registeredAt: timestamp('registered_at').defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.contestId, t.userId] })],
);

export const contestParticipantRelations = relations(contestParticipant, ({ one }) => ({
  contest: one(contest, { fields: [contestParticipant.contestId], references: [contest.id] }),
  user: one(user, { fields: [contestParticipant.userId], references: [user.id] }),
}));

export const contestEditor = pgTable(
  'contest_editor',
  {
    contestId: text('contest_id')
      .notNull()
      .references(() => contest.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    grantedAt: timestamp('granted_at').defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.contestId, t.userId] })],
);

export const contestEditorRelations = relations(contestEditor, ({ one }) => ({
  contest: one(contest, { fields: [contestEditor.contestId], references: [contest.id] }),
  user: one(user, { fields: [contestEditor.userId], references: [user.id] }),
}));

export type Session = typeof session.$inferSelect;

export type ApiToken = typeof apiToken.$inferSelect;

export type User = typeof user.$inferSelect;

export type DifficultyEnum = typeof difficultyEnum.enumValues;

export type Problem = typeof problem.$inferSelect;

export type Testcase = typeof testcase.$inferSelect;

export type Submission = typeof submission.$inferSelect;

export type Contest = typeof contest.$inferSelect;

export type ContestProblem = typeof contestProblem.$inferSelect;

export type ContestParticipant = typeof contestParticipant.$inferSelect;

export type ContestEditor = typeof contestEditor.$inferSelect;
