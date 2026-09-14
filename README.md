# happyjudge

A competitive programming online judging system!

## Features

- Authentication
- Contests
- Many languages (codefort)
- Modern UI

and more!

## Setup

You will need [Bun](https://bun.sh) installed, a PostgreSQL database, and an instance of [codefort](https://github.com/webdev03/codefort) available.

1. Clone this repository with `git clone https://github.com/webdev03/happyjudge.git`
2. Run `bun install`
3. Copy `.env.example` to `.env` with `cp .env.example .env`, then fill in your codefort instance URL and PostgreSQL passwords. Compose uses the restricted `happyjudge_app` runtime role; migrations use the owner URL.
4. Run `bun run db:push` to set up the PostgreSQL database (do this explicitly — the app never migrates itself)
5. Run `bun run build`
6. Run `bun ./build` to start `happyjudge`!

### Docker Compose

Secrets are never hardcoded — set them in `.env` (see `.env.example`,
required: `POSTGRES_PASSWORD`, recommended: `CODEFORT_TOKEN`). If this repo
was ever deployed with the old default `happyjudge/happyjudge` password,
rotate it.

```sh
cp .env.example .env   # edit POSTGRES_PASSWORD, CODEFORT_TOKEN, ...
docker compose build
docker compose --profile migrate run --rm migrate   # one-shot controlled migration
docker compose up -d
```

The Compose Codefort service uses `security/codefort-seccomp.json` and the
`happyjudge-codefort` AppArmor profile. Load the AppArmor profile before
starting the stack:

```sh
sudo apparmor_parser -r -W security/codefort-apparmor
```

If the profile is unavailable, Codefort fails closed instead of starting
without the requested sandbox policy.

This brings up the full stack: `postgres` + `happyjudge` + `codefort`
(sandboxed executor, built from the `codefort/` subtree — update it with
`git subtree pull --prefix=codefort <url> main --squash`).

Notes:

- PostgreSQL and Codefort are NOT published to the host; they are reachable
  only inside the private compose network (`http://codefort:3000` from the
  app). For admin: `docker compose exec postgres ...`.
- Set the SAME `CODEFORT_TOKEN` for both services: codefort enforces it on
  `POST /v1/run`, happyjudge sends it automatically.
- The app binds to `127.0.0.1:3001` as plain HTTP — put TLS termination
  (reverse proxy) at the public boundary.
- The app runtime image contains only production dependencies and runs as
  non-root user `appuser`. The codefort container is fully unprivileged too
  (nobody, zero capabilities) — each execution gets a private user namespace
  with per-job resource ceilings; see `codefort/README.md`.

To update happyjudge, just run `git pull` in the directory that you cloned the source code in! **Note that happyjudge is designed to work with the latest version of codefort on the `main` branch!! If your happyjudge and codefort instances are out of sync, happyjudge may break!**

## Running a contest (operator guide)

1. Grant authoring rights: an admin opens `/admin/users` and ticks
   `create` for each organizer (or `admin` for full access).
2. Author problems: organizers open `/create/problem`, write the statement,
   then add testcases under `/create/problem/[id]/testcases`.
   Testcases in the same subtask are all-or-nothing; their weights sum to the
   subtask score (best score per problem counts).
3. Create the contest at `/contests` (title, window, optional
   "release problems publicly when contest ends").
4. On `/contest/[id]/manage`: add your own problems (they flip to private
   automatically), invite participants by username, adjust timing.
5. Migrate the DB after pulling new code (new tables are additive):
   `docker compose --profile migrate run --rm migrate`.
6. Test matrix before going live: pre-start invisibility (direct
   `/problem/[id]` 404s for invitees), in-window submit via
   `/contest/[id]/problem/[pid]`, late submit rejected (403), scoreboard
   updates live, private-invite enforcement (non-invitees get 404).

Demo seed (psql inside the compose network):

```sql
-- one demo contest with two private problems (adjust ids/timestamps)
insert into contest (id, title, description, starts_at, ends_at, author_id, release_on_end)
values ('demo1', 'Demo Contest', 'Practice', now() - interval '1 hour', now() + interval '2 hours',
  (select id from "user" limit 1), false);
insert into contest_problem (contest_id, problem_id, position, points)
values ('demo1', '<problem-id-1>', 0, 100), ('demo1', '<problem-id-2>', 1, 100);
update problem set is_public = false where id in ('<problem-id-1>', '<problem-id-2>');
```

## Programmatic access

End users, AI agents, and scripts can use the documented JSON API under `/api` instead
of driving browser forms. Start with [`docs/PROGRAMMATIC_API.md`](docs/PROGRAMMATIC_API.md)
or [`llms.txt`](llms.txt), or discover their served URLs with `GET /api`. It documents bearer-token login,
problem/testcase authoring, contest management and joining, editor/participant
management, homepage collection access, submissions, scoreboard access, examples, errors, and limits.
API tokens are shown only when issued; keep them out of logs and source
control. The additive `api_token` table and the existing `contest_editor` table
must be migrated before using the API.

The API documents are also served at `/docs/PROGRAMMATIC_API.md` and
`/llms.txt` for user tooling and AI assistants.
