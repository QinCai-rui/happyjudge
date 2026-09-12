# Happyjudge Contests & Authoring — PLAN (DRAFT)

## 1. Where we are
- Problems are public; homepage lists `homepage = true`; judging works once rows exist.
- No creation UI (`/create` is an empty stub); problems/testcases/users are added by raw SQL.
- `canCreate` gates the empty page; `canAdmin` is checked nowhere.
- No groups, no contests, no scoreboard. Loaders carry "TODO: permissions" notes.
- Hardening already in place: private networks, token-authed sandbox, rate limits,
  401/503 auth semantics, `ORIGIN`-based CSRF handling.

## 2. Goals
1. Authors can create/edit problems + testcases in the UI (no more SQL).
2. Organizers can run timed contests over a private problem set.
3. Participants get a live (freezable) scoreboard.
4. Nothing private leaks: contest problems/testcases/scores enforced server-side.
5. Whole app looks like one coherent product: redesign ships in this build,
   covering new pages plus a consistency pass over existing ones.

## 3. Proposed schema (new tables, nullable links only — no breaking changes)
- `contest(id, title, description, starts_at, ends_at, visibility,
  penalty_minutes, freeze_minutes, author_id, created_at)`
  - `visibility`: `public` (listed, anyone may join) | `unlisted` (link only) |
    `private` (invite list only).
- `contest_problem(contest_id, problem_id, position, points)`
- `contest_participant(contest_id, user_id, registered_at)`
- `submission.contest_id` nullable — attributes in-window submissions to the contest.
- `problem.is_public` boolean (default true) — contest problems stay hidden until
  released; direct `/problem/[id]` URLs enforce it.

## 4. Behavior
- Before start: contest page shows countdown; problems hidden (even by direct URL)
  unless `is_public`.
- During window: participants submit through contest pages; submissions tagged
  with `contest_id`; normal `/problem/[id]` submit blocked for non-public problems.
- After end: scoreboard final; per-contest flag decides whether problems become public.
- Scoring (pick one for MVP, second later):
  - IOI-style: sum of best score per problem (partial credit from testcase weights).
  - ICPC-style: solved count, ties by time + 20 min per wrong submission.
- Scoreboard freeze: hide updates in the last N minutes; reveal at end.
- Permissions: `canAdmin` = everything; `canCreate` = author problems + own contests;
  contest author manages their contest (problems, invites, timing).

## 5. Routes / UI
- `/contests` — list (public + joined + unlisted-via-link).
- `/contest/[id]` — overview, countdown/live status, problem list (in window).
- `/contest/[id]/problem/[pid]` — submit view (or reuse problem page with contest context).
- `/contest/[id]/scoreboard` — live standings honoring freeze.
- `/contest/[id]/manage` — author/admin: timing, invites, problems, release flag.
- `/create/problem`, `/create/problem/[id]/testcases` — authoring UI.
- `/admin/users` (optional) — grant `canCreate`/`canAdmin` without SQL.

## 6. Visual redesign (in scope for this build, not a follow-up)
- One visual language for old + new pages: Tailwind v4 theme tokens (color,
  type scale, spacing, radius) and a shared layout shell (nav, contest-context
  header, footer).
- Existing pages refreshed: home cards, problem statement/sample/submit panel
  (idle/submitting/judging/error states), submission results, login forms.
- New components: scoreboard table (rank movement, per-problem cells, responsive
  collapse), countdown/status banner, invite management, testcase editor.
- Forms everywhere: labels, inline validation errors, focus states, keyboard flow.
- Accessibility baseline: contrast ratios, visible focus, semantic landmarks.
- Stretch, decide during build: dark mode; keep vs replace current aesthetic.

## 7. Security checklist (must-haves, not nice-to-haves)
- Visibility enforced in every `load` + action (close the current TODOs).
- Hidden testcase outputs never leave the server (existing rule preserved).
- Contest-window checks on submit actions, not just UI hiding.
- Freeze logic server-side; no pre-reveal via API/data endpoints.
- Keep existing rate limits; add per-contest submit throttle if needed.
- No scoreboard user enumeration beyond what's already public.

## 8. Rollout
1. Migration via the existing `migrate` job flow (drizzle push, reviewed SQL first).
2. Seed one demo contest with 2 problems via SQL for testing.
3. Test matrix: pre-start visibility, in-window submit, late submit rejected,
   freeze behavior, unfreeze reveal, private-invite enforcement.
4. Docs: README operator section for running a contest.

## 9. Open questions — decided together 2026-09-12
- [x] Scoring format for MVP → **IOI partial scoring** (sum of best per problem).
- [x] Access model for MVP → **Private invite-only** (no public listing; invited
  participants + author/admin only).
- [x] Scope phasing → **Everything at once** (authoring UI + contests together).
- [x] Scoreboard freeze rules → **Always live** (no freeze logic needed).
- [x] Design stretch: dark mode yes/no; keep vs replace current aesthetic.
  → **Fresh redesign + dark mode** (class toggle, persisted, new shared shell).
