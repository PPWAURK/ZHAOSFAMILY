# syntax=docker/dockerfile:1
#
# Multi-stage image for the NestJS backend. The backend is self-contained — it
# has NO @zhao/* workspace dependencies — so only its own subtree is installed.
# Build once in CI, run the SAME image in prod. See docs/deployment-hardening-plan.md.
#
# Base and runtime share node:22-bookworm-slim so the Prisma "native" query
# engine generated at build time matches the runtime libc/OpenSSL. If the base
# image changes, revisit `binaryTargets` in prisma/schema.prisma.

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate
# Prisma query engine needs OpenSSL + CA certs at runtime.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# ---------- build ----------
FROM base AS build
WORKDIR /repo
# Manifests first for layer caching. A frozen-lockfile install needs every
# workspace package.json present, even though we only build the backend.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/types/package.json packages/types/
COPY packages/utils/package.json packages/utils/
# Install only the backend subtree (skips web/mobile deps).
RUN pnpm install --frozen-lockfile --filter backend...
# Backend source (+ prisma schema/migrations); prebuild runs `prisma generate`.
COPY apps/backend/ apps/backend/
RUN pnpm --filter backend build
# Prune to a self-contained production bundle (prod deps only).
RUN pnpm --filter backend deploy --prod --legacy /prod/backend
# Carry built output + prisma schema/migrations into the bundle.
RUN cp -r apps/backend/dist /prod/backend/dist \
 && cp -r apps/backend/prisma /prod/backend/prisma
# `pnpm deploy` reinstalls prod deps but does NOT carry the GENERATED Prisma
# client (it is generated into node_modules, not stored as a package). Regenerate
# it INTO the pruned bundle, using the build stage's prisma CLI.
RUN cd /prod/backend \
 && /repo/apps/backend/node_modules/.bin/prisma generate --schema=prisma/schema.prisma

# ---------- runtime ----------
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Prisma CLI (pinned to the client version) so the container itself can run
# `prisma migrate status` (CI drift gate) and `prisma migrate deploy` (manual /
# opt-in migrations). The pruned --prod bundle does not include the CLI.
RUN npm install -g prisma@6.19.3 && npm cache clean --force
COPY --from=build /prod/backend/ ./
# PORT / API_PREFIX come from the mounted apps/backend/.env (defaults: 3002 / api).
EXPOSE 3002
CMD ["node", "dist/main.js"]
