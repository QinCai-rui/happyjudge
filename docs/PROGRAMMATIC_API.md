# Programmatic API

The API is for end users, scripts, and AI agents that need to use supported
problem and contest workflows without driving the browser UI. The base URL is the
happyjudge origin and all API responses use JSON.

`GET /api` returns API metadata and links to this reference and `/llms.txt`.

## Authentication

Most endpoints require either the browser's `auth-session` cookie or a personal
API token. The non-browser entry point is:

```sh
curl -sS -X POST "$HJ/api/auth/login" -H 'content-type: application/json' \
  -d '{"username":"alice","password":"correct horse battery staple","name":"agent"}'
```

The response contains a bearer token. Store it securely; it is not shown again.
Tokens expire after 30 days by default. A logged-in session can create an
explicitly named token, valid for at most 365 days:

```sh
curl -sS -X POST "$HJ/api/auth/tokens" -H 'content-type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  -d '{"name":"contest-automation","expiresAt":"2027-01-01T00:00:00Z"}'
```

Send the returned token on subsequent calls:

```sh
curl -sS "$HJ/api/auth/me" -H "authorization: Bearer $TOKEN"
```

`GET /api/auth/tokens` lists metadata without token values. Revoke a token
with `DELETE /api/auth/tokens/:id`. Passwords, password hashes, and token
hashes are never returned.

New installations can use `POST /api/auth/register` with the same JSON fields
as login (`username`, `password`, optional `name`). Registration follows the
existing username/password rules and returns a bearer token, but new users do
not receive authoring or administrator permissions.

## Response and errors

Successful responses have the form `{"data": ...}`. Errors have the form:

```json
{ "error": { "code": "validation_error", "message": "..." } }
```

Common status codes are 400 for invalid JSON or fields, 401 for missing or
expired authentication, 403 for a permission or contest-window denial, 404
for an intentionally hidden resource, 409 for a duplicate/conflicting
operation, 413 for an oversized request/code body, 429 for a rate limit or
full judge queue, and 503 when Codefort is unavailable.

Dates are ISO-8601 strings. Request bodies must be JSON objects. IDs in URL
paths must be URL encoded.

## Endpoint index

- Authentication: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, and `/api/auth/tokens`
- Problems: `/api/problems` and `/api/problems/:id`; use `?homepage=true` for the public homepage collection
- Testcases: `/api/problems/:id/testcases` and `/api/problems/:id/testcases/:testcaseId`
- Contests: `/api/contests` and `/api/contests/:id`
- Contest problems, participants, editors, and joining: `/api/contests/:id/...`
- Judging: `/api/problems/:id/submissions` or `/api/contests/:id/problems/:problemId/submissions`
- Results: `/api/submissions/:id` and `/api/contests/:id/scoreboard`

The detailed endpoint tables below define the supported methods and behavior.

## Problems and testcases

Problem and contest creation requires `canCreate` or `canAdmin`. A problem can
be edited by its author, an administrator, or an editor of a contest containing
it. Delete requires removing it from every contest first.

```sh
curl -sS -X POST "$HJ/api/problems" -H 'content-type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  -d '{"title":"Two numbers","statement":"Read two integers and print their sum.","difficulty":"easy","timeLimit":1000,"memoryLimit":64,"tags":["math"],"sampleTestcases":[{"input":"2 3","output":"5"}],"isPublic":false}'

curl -sS -X PATCH "$HJ/api/problems/PROBLEM_ID" -H 'content-type: application/json' \
  -H "authorization: Bearer $TOKEN" -d '{"statement":"Read two integers and print their sum."}'
```

| Method | Path                                      | Purpose                                                                                                                |
| ------ | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/problems`                           | List public problems; `?mine=true` lists your authored problems; `?homepage=true` lists the public homepage collection |
| POST   | `/api/problems`                           | Create a problem                                                                                                       |
| GET    | `/api/problems/:id`                       | Read a visible problem                                                                                                 |
| PATCH  | `/api/problems/:id`                       | Edit a problem                                                                                                         |
| DELETE | `/api/problems/:id`                       | Delete an unlinked problem                                                                                             |
| GET    | `/api/problems/:id/testcases`             | List authoring testcases, including input/output                                                                       |
| POST   | `/api/problems/:id/testcases`             | Create a testcase                                                                                                      |
| GET    | `/api/problems/:id/testcases/:testcaseId` | Read one authoring testcase                                                                                            |
| PATCH  | `/api/problems/:id/testcases/:testcaseId` | Replace a testcase                                                                                                     |
| DELETE | `/api/problems/:id/testcases/:testcaseId` | Delete a testcase                                                                                                      |

Testcase create/update requires `input`, non-empty `output`, integer `weight`
from 0 to 10000, and boolean `isHidden`. Testcase output is authoring data
and is only returned to the problem author, an authorized contest editor, or
an administrator. It is never returned to public/participant problem
responses or submission results.

Each `caseGroup` is an all-or-nothing subtask. Its available points are the
sum of its testcase weights, and it earns those points only if every testcase
in the group is accepted. A testcase with weight `0` still must pass for its
subtask to score. New submission responses include `scoringVersion` so clients
can identify this rule.

`homepage=true` matches the browser home page: it returns at most 80 public
problems marked for homepage display. Combine it with
`GET /api/problems/progress?id=...` to obtain the current user's solved or
attempted state.

## Contests

```sh
curl -sS -X POST "$HJ/api/contests" -H 'content-type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  -d '{"title":"Spring contest","description":"Practice","startsAt":"2026-10-01T12:00:00Z","endsAt":"2026-10-01T15:00:00Z","releaseOnEnd":true}'

curl -sS -X POST "$HJ/api/contests/CONTEST_ID/problems" -H 'content-type: application/json' \
  -H "authorization: Bearer $TOKEN" -d '{"problemId":"two-numbers-abc123","points":100,"position":0}'
```

| Method | Path                                     | Purpose                                                             |
| ------ | ---------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/api/contests`                          | List contests you own, joined, or edit; admins receive all contests |
| POST   | `/api/contests`                          | Create a contest and add the author                                 |
| GET    | `/api/contests/:id`                      | Read a contest and its visible problems                             |
| PATCH  | `/api/contests/:id`                      | Edit contest details/window                                         |
| DELETE | `/api/contests/:id`                      | Delete a contest                                                    |
| POST   | `/api/contests/:id/invite-token`         | Regenerate the invite token, manager only                           |
| GET    | `/api/contests/:id/problems`             | List visible contest problems                                       |
| POST   | `/api/contests/:id/problems`             | Add a problem; owners add their own, editors/admins may add any     |
| PATCH  | `/api/contests/:id/problems/:problemId`  | Change points or position                                           |
| DELETE | `/api/contests/:id/problems/:problemId`  | Remove a problem                                                    |
| POST   | `/api/contests/:id/join`                 | Join using `{ "inviteToken": "..." }`                               |
| GET    | `/api/contests/:id/participants`         | List participants, manager only                                     |
| POST   | `/api/contests/:id/participants`         | Invite by `{ "username": "..." }`, manager only                     |
| DELETE | `/api/contests/:id/participants/:userId` | Remove a participant, manager only                                  |
| GET    | `/api/contests/:id/editors`              | List editors, owner/admin only                                      |
| POST   | `/api/contests/:id/editors`              | Grant editor access by username, owner/admin only                   |
| DELETE | `/api/contests/:id/editors/:userId`      | Revoke editor access, owner/admin only                              |

The contest manager response includes the current `inviteToken`; it is not
included for ordinary participants. Before the contest starts, participants
cannot see its problems. Private contest resources use 404 rather than
revealing that they exist. Contest problems are made private when added and
are released after the end only when `releaseOnEnd` is true.

Contest editors can edit a problem and manage its testcases when that problem
is linked to their contest. They cannot edit unrelated problems. Contest owners
and administrators control who receives editor access.

## Practice runs, progress, and submissions

Public problems use the direct endpoint:

```sh
curl -sS -X POST "$HJ/api/problems/PROBLEM_ID/submissions" \
  -H 'content-type: application/json' -H "authorization: Bearer $TOKEN" \
  -d '{"language":"python","code":"print(sum(map(int, input().split())))"}'
```

Contest problems must use the contest endpoint, which tags the submission and
checks membership, the exact problem link, and the live window:

```sh
curl -sS -X POST "$HJ/api/contests/CONTEST_ID/problems/PROBLEM_ID/submissions" \
  -H 'content-type: application/json' -H "authorization: Bearer $TOKEN" \
  -d '{"language":"python","code":"print(sum(map(int, input().split())))"}'
```

Both return `202` with a submission ID. Poll the result and read the scoreboard:

```sh
curl -sS "$HJ/api/submissions/SUBMISSION_ID" -H "authorization: Bearer $TOKEN"
curl -sS "$HJ/api/contests/CONTEST_ID/scoreboard" -H "authorization: Bearer $TOKEN"
```

The scoreboard response includes one ordered cell per problem and ranks by score
then time taken to obtain the final contributing best score. This time is the
latest `bestAt` elapsed from the contest start, not a sum across problems.
`per` remains available for compatibility and is equivalent to
`cells.map(cell => cell.score)`, but is deprecated.

```json
{
  "data": {
    "problems": [{ "problemId": "p1", "title": "Warmup", "points": 100, "position": 1 }],
    "rows": [
      {
        "userId": "user_1",
        "username": "alice",
        "cells": [
          {
            "problemId": "p1",
            "score": 100,
            "attempts": 3,
            "bestIndex": 3,
            "bestAt": "2026-09-14T10:03:00.000Z",
            "isFull": true,
            "hasPending": false,
            "isAttempted": true
          }
        ],
        "per": [100],
        "total": 100,
        "totalTimeSecs": 180,
        "rank": 1
      }
    ]
  }
}
```

Run code with arbitrary input without creating a submission or affecting a
scoreboard. This uses the same language validation, execution limits, and
bounded queue as judging:

```sh
curl -sS -X POST "$HJ/api/problems/PROBLEM_ID/run" \
  -H 'content-type: application/json' -H "authorization: Bearer $TOKEN" \
  -d '{"language":"python","code":"print(sum(map(int, input().split())))","stdin":"2 3"}'
```

For a live contest, use the equivalent contest route:

```sh
curl -sS -X POST "$HJ/api/contests/CONTEST_ID/problems/PROBLEM_ID/run" \
  -H 'content-type: application/json' -H "authorization: Bearer $TOKEN" \
  -d '{"language":"python","code":"print(sum(map(int, input().split())))","stdin":"2 3"}'
```

Read your recent submission summaries and progress state with:

```sh
curl -sS "$HJ/api/submissions?problemId=PROBLEM_ID&limit=20" -H "authorization: Bearer $TOKEN"
curl -sS "$HJ/api/problems/progress?id=PROBLEM_ID&id=ANOTHER_PROBLEM_ID" -H "authorization: Bearer $TOKEN"
```

| Method | Path                                                | Purpose                                                                    |
| ------ | --------------------------------------------------- | -------------------------------------------------------------------------- |
| GET    | `/api/submissions`                                  | List your submission summaries; filters: `problemId`, `contestId`, `limit` |
| POST   | `/api/problems/:id/submissions`                     | Submit to a public problem                                                 |
| POST   | `/api/contests/:id/problems/:problemId/submissions` | Submit during a contest                                                    |
| POST   | `/api/problems/:id/run`                             | Run code with custom input for a public problem                            |
| POST   | `/api/contests/:id/problems/:problemId/run`         | Run code with custom input in a live contest                               |
| GET    | `/api/problems/progress`                            | Read progress for up to 100 public IDs; repeat `id` query parameter        |
| GET    | `/api/submissions/:id`                              | Read your own submission, or any submission as admin                       |
| GET    | `/api/contests/:id/scoreboard`                      | Read the authorized contest scoreboard                                     |

Submission results never include hidden testcase output. Non-hidden output is
returned only where the existing submission visibility permits it. Custom-run
responses contain Codefort's `exitCode`, `stdout`, `stderr`, and timing stats,
but are never stored. Codefort language validation and the judge queue are
server-side.

## Limits and operational notes

- Login: 20 attempts per client address per minute.
- Direct and contest submissions: 10 per user per minute.
- Direct and contest custom runs: 20 per user per minute.
- Contest joins: 10 attempts per user per contest per minute.
- Code: 128 KiB; testcase stdin: 256 KiB; submission: 100 testcases.
- Judge queue: 200 pending jobs.
- Rate limits and the execution queue are enforced by the application and may
  temporarily reject requests when limits are reached.
- Keep bearer tokens out of source control, prompts, logs, URLs, and client-side bundles. Use HTTPS at the public boundary.
- The API does not provide bulk import/export, arbitrary user creation, or role
  escalation. Administrator role changes remain available through the browser.
