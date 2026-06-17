# Backend (NestJS + Prisma) production image.
# Build from the REPO ROOT so the pnpm workspace lockfile is in context:
#   docker build -f apps/backend/Dockerfile -t zhao-backend .
# (docker-compose.prod.yml already sets context: . and this dockerfile path.)

FROM node:22-slim

# openssl is required by Prisma's query engine at runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# pnpm version comes from the "packageManager" field in package.json.
RUN corepack enable

WORKDIR /repo

# --- Dependency layer (cached unless a manifest or the lockfile changes) ---
# All workspace manifests are needed for a --frozen-lockfile install, even
# though the backend itself has no workspace dependencies.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/types/package.json packages/types/
COPY packages/utils/package.json packages/utils/

RUN pnpm install --frozen-lockfile

# --- Build layer ---
# Backend source only (web/mobile source never enters the image).
COPY apps/backend apps/backend
# `build` runs the `prebuild` hook (prisma generate) before `nest build`.
RUN pnpm --filter backend build

WORKDIR /repo/apps/backend

# NODE_ENV is set AFTER install/build so dev dependencies were available for
# the build, while the running process sees production.
ENV NODE_ENV=production
EXPOSE 3002

CMD ["node", "dist/main.js"]
