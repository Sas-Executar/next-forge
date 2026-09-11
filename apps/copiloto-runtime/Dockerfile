# Fase 3 (D2/ADR-004) — standalone container for the Agent SDK runtime,
# explicitly NOT a Vercel/serverless deploy target (docs.claude.com/en/
# agent-sdk/hosting: "the SDK spawns and supervises a claude CLI
# subprocess ... hosting it is not like hosting a stateless API
# wrapper"). Built from the monorepo ROOT as build context (workspace
# deps: @repo/agent-runtime, @repo/database), e.g.:
#
#   docker build -f apps/copiloto-runtime/Dockerfile -t copiloto-runtime .
#
# NOT built or run in this sandbox session — no Docker daemon available
# here (`docker version` reaches the CLI but not a socket). Written
# against Bun's own documented Docker patterns, not verified by an
# actual `docker build` in this session. Disclosed, not assumed working.

FROM oven/bun:1.3.11-slim AS base
WORKDIR /app

# Workspace manifests only, first, for layer caching — mirrors every
# other Dockerfile pattern this repo's own scripts/skip-ci.js convention
# assumes for path-based build skipping (apps/{app,web,api} on Vercel use
# an equivalent "manifests first" install step via vercel.json).
COPY package.json bun.lock ./
COPY apps/copiloto-runtime/package.json ./apps/copiloto-runtime/package.json
COPY packages/agent-runtime/package.json ./packages/agent-runtime/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/domain/package.json ./packages/domain/package.json
COPY packages/schemas/package.json ./packages/schemas/package.json
COPY packages/application/package.json ./packages/application/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json

RUN bun install --frozen-lockfile

COPY apps/copiloto-runtime ./apps/copiloto-runtime
COPY packages/agent-runtime ./packages/agent-runtime
COPY packages/database ./packages/database
COPY packages/domain ./packages/domain
COPY packages/schemas ./packages/schemas
COPY packages/application ./packages/application
COPY packages/typescript-config ./packages/typescript-config

# packages/database/generated is gitignored (Prisma-generated) — same
# requirement ci.yml's own typecheck/test jobs document for every other
# workflow that imports @repo/database.
RUN cd packages/database && bunx prisma generate --no-hints --schema=./prisma/schema.prisma

# 1 GiB RAM / 1 CPU / 5 GiB disk per agent session is the doc's own
# starting point (docs.claude.com/en/agent-sdk/hosting#resources) — size
# the container's resource limits at the orchestrator level (Kubernetes
# requests/limits, ECS task definition, etc.), not in this Dockerfile.
EXPOSE 8787
ENV COPILOTO_RUNTIME_PORT=8787

# ANTHROPIC_API_KEY, DATABASE_URL and COPILOTO_RUNTIME_{WORK_DIR,CONFIG_DIR}
# are supplied at deploy time (secret manager / orchestrator env), never
# baked into the image — same rule INFRASTRUCTURE.md already states for
# every other app in this repo ("real secret ever gets committed").
CMD ["bun", "run", "apps/copiloto-runtime/src/server.ts"]
