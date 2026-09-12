# Pinned digests: update intentionally (see `docker buildx imagetools inspect`).
FROM oven/bun:1@sha256:9114c058aeae42162ee16dd5084b95fe9473970bb6bcb5b232ab1630f0546895 AS builder

WORKDIR /app

# Install dependencies first for better layer caching.
# NOTE: repo uses `bun.lock` (text lockfile); do not use `bun.lockb*` here.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy the rest of the application (.dockerignore keeps secrets out of context).
COPY . .

# Build the application. No secrets or DATABASE_URL are needed at build time:
# - server code uses $env/dynamic/private (runtime env, not baked in)
# - codefort language list is loaded lazily at request time, not at import
RUN bun run prepare
RUN bun run build

# ---- Migration image: has devDependencies (drizzle-kit) + schema source ----
# Used only by the `migrate` compose profile: `docker compose --profile migrate run --rm migrate`
# It never runs the app and never ships to production.
# --force is operator-approved here (explicit one-shot job), never automatic.
FROM builder AS migrate
CMD ["bun", "run", "db:push", "--force"]

# ---- Production runtime: prod dependencies only, non-root ----
FROM oven/bun:1-slim@sha256:cb3bbbb08e13a4a2ff400f24c7a2a1d5efa83f6ef8544d52d95a519631e2fc61 AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Self-contained SvelteKit output.
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json /app/bun.lock ./

# Install ONLY production dependencies so dev tooling (vite, rollup,
# drizzle-kit, ...) never ships to runtime.
RUN bun install --production --frozen-lockfile && rm -rf /root/.bun/install/cache /tmp/*

# Drop privileges: never run as root.
# (Debian slim has useradd, not adduser/addgroup.)
RUN useradd -r -m -s /usr/sbin/nologin appuser \
  && chown -R appuser:appuser /app
USER appuser

EXPOSE 3001

# NOTE: schema migrations are NOT run here. Run them explicitly via the
# `migrate` target/service with a privileged MIGRATION_DATABASE_URL.
# TLS is expected at the reverse proxy in front of this plain-HTTP service.
CMD ["bun", "./build"]
