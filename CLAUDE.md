# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo Layout

pnpm + Turborepo monorepo (`pnpm@11.1.3`, declared in [package.json](package.json) as `packageManager`). Workspaces are defined in [pnpm-workspace.yaml](pnpm-workspace.yaml); do not use `npm`.

Three apps:

- `apps/web` — Next.js 15 (App Router, React 19, mixed JS/TS — `allowJs: true`). Static export (`output: 'export'` in [next.config.js](apps/web/next.config.js)). Package name `@zhao/web`.
- `apps/mobile` — Expo SDK 54 (expo-router 6, React Native 0.81, React 19, NativeWind, TypeScript). Package name `@zhao/mobile`.
- `apps/backend` — NestJS 11 (TypeScript) + Prisma 6 + MySQL 8.4. MinIO for private file storage. Package name `backend`.

Four shared workspace packages (TypeScript, source-imported via `workspace:*`):

- `@zhao/api` — axios client factory, endpoint helpers (`auth`, `products`, `restaurants`, `suppliers`), TanStack Query keys, `ApiClientError`.
- `@zhao/auth` — Zustand auth store + action factories. Web and mobile both consume this.
- `@zhao/types` — shared DTOs/contracts.
- `@zhao/utils` — pure utilities (env, strings).

Companion services run via [docker-compose.yml](docker-compose.yml): `mysql` (3307 → 3306) and `minio` (9000/9001). Note `db:up` starts **mysql only**; start MinIO explicitly with `docker compose up -d minio` if needed. The backend's `presence` module also needs Redis (`REDIS_URL`, default `redis://127.0.0.1:6379`), which the dev compose file does not provide.

ZHAO Monitor (a native macOS ops app: health checks, `gh workflow run` deploys, EAS releases, server `.env` editing over SSH) now lives in its own repo at `~/Documents/GitHub/zhao-monitor`. `tools/zhao-monitor/` here holds only stale, gitignored build output. It reads the backend's `presence/mobile/summary`, `traffic/today` and `analytics/monthly` endpoints; the presence and analytics ones are guarded by `MONITOR_ANALYTICS_TOKEN` ([monitor-analytics-token.guard.ts](apps/backend/src/auth/guards/monitor-analytics-token.guard.ts)), so keep those response shapes stable.

`ZHAO 2/`, `apps/web/Dashboard.html`, the `*.sql` dump files, and `backups/` are not part of the build.

## Common Commands

Run from repo root unless noted.

```bash
pnpm install                 # install all workspaces
pnpm db:up                   # start MySQL via docker compose (mysql only)
pnpm db:generate             # prisma generate
pnpm dev                     # turbo dev --parallel (all apps that declare a dev task)
pnpm dev:web                 # next dev only (port 3000)
pnpm dev:api                 # nest start --watch only (port 3002)
pnpm dev:mobile              # expo start
pnpm build                   # turbo build (web + backend; backend prebuild runs prisma generate)
pnpm typecheck               # turbo typecheck across web/mobile/backend/packages
pnpm lint                    # turbo lint across all workspaces
pnpm test                    # turbo test (backend jest, web jest, mobile jest-expo)
pnpm format                  # prettier --write . (root config governs the whole repo)
pnpm db:push                 # prisma db push (no migration file)
pnpm db:migrate              # ⚠️ wrapper hardcodes --name init; for new migrations run prisma directly
pnpm db:seed                 # node prisma/seed.js
```

Mobile shortcuts at root: `pnpm mobile:start`, `pnpm mobile:android`, `pnpm mobile:ios`, `pnpm mobile:test`, `pnpm mobile:lint`.

Filter-style commands work for anything not exposed at root:

```bash
pnpm --filter @zhao/web typecheck
pnpm --filter @zhao/mobile typecheck
pnpm --filter backend test
pnpm --filter backend test:e2e
pnpm --filter backend exec jest path/to/file.spec.ts        # single backend test
pnpm --filter @zhao/web exec jest tests/SomePage.test.js    # single web test
pnpm --filter @zhao/mobile exec jest path/to/file.test.tsx  # single mobile test
# New migration: write the SQL by hand (see Prisma Schema Notes), then apply with:
pnpm --filter backend exec prisma migrate deploy   # ⚠️ NEVER `migrate dev` here — see Prisma Schema Notes
```

Test runners: backend uses jest (`*.spec.ts` next to sources, DB mocked); web uses jest via `next/jest` with tests in `apps/web/tests/`; mobile uses `jest-expo`. The shared `packages/*` have no tests. For UI changes, also run `pnpm dev:web` and exercise the feature in the browser.

Web `lint` also runs [check-no-new-js.mjs](apps/web/scripts/check-no-new-js.mjs), a JS→TS ratchet: it fails if the count of `.js`/`.jsx` files under `src/` + `app/` exceeds `BASELINE`. New web files must be `.ts`/`.tsx`; when you migrate a file to TS, lower `BASELINE` (never raise it).

CI ([ci.yml](.github/workflows/ci.yml), on PRs and pushes to main) runs `db:generate` → `lint` → `typecheck` → `build` → backend tests → mobile tests. `format:check` is not a gate (repo isn't Prettier-clean). Pushes to main touching `apps/web/**` or `packages/**` auto-deploy the web static export via SFTP ([deploy-web.yml](.github/workflows/deploy-web.yml)). Backend deploy ([deploy-backend.yml](.github/workflows/deploy-backend.yml)) is manual-only: builds a GHCR image and runs [docker-compose.backend.yml](docker-compose.backend.yml) on the prod host; migrations run only if the `apply_migrations` input is checked.

## Local URLs / Env

- Web: `http://localhost:3000`
- Backend: `http://localhost:3002/api` (global prefix set in [main.ts](apps/backend/src/main.ts); change via `API_PREFIX`)
- Health: `GET http://localhost:3002/api/health`
- Mobile API base resolves via `MOBILE_API_URL` in [apps/mobile/src/lib/env.ts](apps/mobile/src/lib/env.ts) — use the LAN IP of the dev machine, not `localhost`, when running on a device.
- Web reads `NEXT_PUBLIC_API_BASE_URL` (falls back to `NEXT_PUBLIC_API_URL`, then `http://localhost:3002/api`) — see [api-client.ts](apps/web/src/shared/api/api-client.ts).
- Backend env template: [apps/backend/.env.example](apps/backend/.env.example). `DATABASE_URL` defaults to port **3306**, but docker-compose maps MySQL to **3307** on the host — adjust your `.env` accordingly, or run against an existing MySQL.

## Backend Architecture

Entry: [app.module.ts](apps/backend/src/app.module.ts) wires one module per folder in `apps/backend/src/` (auth, training, orders, inventory, recipes, case-shares, abc-scores, analytics, presence, traffic, notifications, waiting-queue, …) plus shared `prisma` and `minio`. A global `ThrottlerGuard` limits every route to 100 requests/min by default. `src/maintenance/` holds standalone scripts (e.g. inactive-user purge), not a Nest module.

Layering enforced by [AGENTS.md](AGENTS.md): `controller` (thin) → `service` (business logic) → Prisma (data access). DTOs use `class-validator` and the global `ValidationPipe` runs with `whitelist` + `forbidNonWhitelisted` — unknown fields are rejected.

### Auth & RBAC

[auth.service.ts](apps/backend/src/auth/auth.service.ts) does **not** use a JWT library. Access tokens are custom `base64url(payload).hmac-sha256(secret)` strings (8h TTL); refresh sessions live in the `refresh_sessions` table. Passwords use `scrypt` with the format `scrypt$<salt>$<derivedKey>`. The HMAC secret comes only from `AUTH_TOKEN_SECRET`; missing configuration is treated as an error.

Authorization is RBAC via Prisma tables `Role`, `Permission`, `UserRole`, `RolePermission`. To gate a route:

```ts
@RequirePermissions(TRAINING_MATERIAL_PERMISSIONS.create)
@UseGuards(PermissionGuard)
```

Permission keys live in [permissions.ts](apps/backend/src/auth/permissions.ts). `PermissionGuard` resolves the bearer token's permissions via `AuthService.getPermissionsForToken` and 403s on missing keys.

### Prisma Schema Notes

[schema.prisma](apps/backend/prisma/schema.prisma) maps to a legacy database with mixed French/Chinese column names: e.g. `Supplier` is table `fournisseurs` with column `nom`; `Product` has `nom_cn`, `designation_fr`, `prix_u_ht`. Use the Prisma model field names in code; only map names appear in raw SQL or migrations. `Product.id` and `InventoryMovement.id` are `BigInt` — be careful when serializing to JSON.

Migrations directory: [apps/backend/prisma/migrations/](apps/backend/prisma/migrations/), folders named `YYYYMMDDHHMMSS_description`.

**⚠️ Never run `prisma migrate dev` against this DB.** The base tables (`users`, `restaurants`, …) were imported from an SQL dump and are NOT part of the migration history. `migrate dev` validates by replaying every migration on a fresh empty shadow DB, where the first migration's foreign key to `users` fails (`P3006 / Failed to open the referenced table 'users'`). That error happens during shadow validation only — it never touches the real DB. To apply a new migration: hand-write `migration.sql` in a new timestamped folder (copy the format of an existing one), then run `prisma migrate deploy` (applies pending migrations straight to the real DB, skips already-applied ones). `prisma db push` also works for dev. Verify with `prisma migrate status` (should say "up to date") and `prisma migrate diff` (should show no drift).

## Frontend (Web) Architecture

App Router routes live in [apps/web/app](apps/web/app): public pages (`accept-invitation`, `reset-password`, `privacy`, `support`, `delete-account`, …) and the authenticated `dashboard/*` tree. Route files stay thin; feature code lives in `apps/web/src/features/<domain>`, usually one domain per dashboard section. Shared cross-feature code goes in `apps/web/src/shared` (`api`, `constants`, `hooks`, `utils`).

Path aliases (see [tsconfig.json](apps/web/tsconfig.json) and [jsconfig.json](apps/web/jsconfig.json)):

- `@/*` → `./src/*` or `./*`
- `@features/*` → `./src/features/*`
- `@shared/*` → `./src/shared/*`
- `@zhao/api`, `@zhao/auth`, `@zhao/types`, `@zhao/utils` — workspace packages, also listed in `transpilePackages` in [next.config.js](apps/web/next.config.js)

[apps/web/FRONTEND_STANDARDS.md](apps/web/FRONTEND_STANDARDS.md) is the authoritative frontend standard (Chinese). It locks in feature-based folder layout, TypeScript for new code, CSS Modules, and "all API calls go through `api-client` or a feature service." (`apps/web/AGENTS.md` is an auto-generated memory snapshot, not a hand-written doc — ignore it.)

### Static export implications

`next.config.js` sets `output: 'export'`, so:

- **Every dynamic route (`[id]`, etc.) must export `generateStaticParams`** — Next will fail the build otherwise. See [app/dashboard/training/[id]/page.js](apps/web/app/dashboard/training/[id]/page.js) and [app/dashboard/stores/[storeId]/page.js](apps/web/app/dashboard/stores/[storeId]/page.js) for working references.
- No server actions, no request-time route handlers, no middleware-based auth — auth is enforced client-side via the shared `@zhao/auth` store and server-side by the backend on each API call.

### API access

All HTTP calls go through [api-client.ts](apps/web/src/shared/api/api-client.ts), which is itself built on `createApiClient` from `@zhao/api`. The client attaches `Authorization: Bearer <token>` and retries once on 401 by calling `/auth/refresh`. Do **not** write raw `fetch`/`axios` calls in feature code — extend or reuse the shared client. Auth tokens persist in `localStorage` or `sessionStorage` depending on the "remember me" choice; the client mirrors changes back into storage.

App-level providers live in [app/providers.tsx](apps/web/app/providers.tsx) (TanStack Query) and are mounted from [app/layout.js](apps/web/app/layout.js).

## Mobile Architecture

Routes live in [apps/mobile/app](apps/mobile/app) (`_layout.tsx`, `index.tsx`, `reset-password.tsx`) — expo-router uses file-system routing similar to Next.js. Typed routes are enabled (`experiments.typedRoutes`). There are only three route files: `index.tsx` renders `LoginScreen`, which itself renders `DashboardHomeScreen` once authenticated, so in-app navigation is component state, not expo-router routes. Feature code is under `apps/mobile/src/features/<domain>`.

`apps/mobile/src/lib/` wires the shared packages for native:

- [api.ts](apps/mobile/src/lib/api.ts) creates a mobile-specific axios client via `createApiClient` from `@zhao/api`, plus an auth store + actions via `@zhao/auth`.
- [tokenStorage.ts](apps/mobile/src/lib/tokenStorage.ts) is a `secureTokenStorage` backed by `expo-secure-store` — replaces web's `localStorage` flow.
- [useScreenCaptureProtection.ts](apps/mobile/src/lib/useScreenCaptureProtection.ts) blocks screen capture on internal training content (iOS: app-switcher blur + screenshot alert; Android: prevent recording).

Styling is NativeWind (Tailwind syntax) configured by [tailwind.config.js](apps/mobile/tailwind.config.js) and [nativewind-env.d.ts](apps/mobile/nativewind-env.d.ts). EAS Build config: [eas.json](apps/mobile/eas.json); app config: [app.json](apps/mobile/app.json) (slug `zhao-family-mobile`, scheme `zhaofamily`).

## Conventions

[AGENTS.md](AGENTS.md) is the authoritative coding standard for the whole repo (extensive, in Chinese). High-impact rules:

- Keep controllers thin; business logic lives in services. Don't access Prisma from controllers.
- DTOs validate input only — no business logic. Separate Create/Update/Query DTOs.
- Never expose Prisma entities directly as API responses; map to a view shape.
- Don't put DB models, Prisma types, or backend internals directly into frontend code — go through `@zhao/types` and `@zhao/api`.
- File size soft caps: function ≤40 lines, class ≤200 lines, file ≤300 lines, controller ≤150 lines, public methods per class ≤10. Going over requires a stated reason.
- Repo-wide Prettier config: [prettier.config.mjs](prettier.config.mjs). Repo-wide ESLint base: [eslint.config.mjs](eslint.config.mjs). Each app/package also has its own `eslint.config.mjs`. Use `pnpm format` and `pnpm lint`.
- Naming: avoid `manager`, `handler`, `processor`, `helper`, `common` unless that role genuinely exists.
- Don't fake "tests pass" / "build passes" / "lint passes" in your output unless you actually ran them — AGENTS.md calls this out explicitly.

The repo's primary working language with the user is **French**. The codebase itself is multilingual: UI copy is trilingual zh/en/fr, comments are mixed, and DB column names are often French.

## Committing

After finishing each change, ask the user whether to commit it — never commit without their yes. With the question, propose how to split the work into logical commits (one concern per commit: e.g. backend vs web vs mobile, feature vs test vs chore/version bump), listing for each batch the files it contains and a ready-to-use commit message in the conventional format (`feat|fix|refactor|docs|test|chore|perf|ci(scope): description`, matching `git log` style). On approval, stage and commit each batch separately (`git add <files>`, never `git add -A` when unrelated changes are present).

## Memory

Per-session context is auto-loaded from `~/.claude/projects/-Users-shihongwang-Documents-GitHub-zhao-family/memory/`. Use it for prior decisions and ongoing initiatives; verify any specific file/function reference before relying on it.
