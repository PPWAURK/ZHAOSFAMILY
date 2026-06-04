# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo Layout

npm workspaces monorepo with two apps:

- `apps/web` — Next.js 16 (App Router, React 19, JavaScript). Static export (`output: 'export'` in [next.config.js](apps/web/next.config.js)).
- `apps/backend` — NestJS 11 (TypeScript) + Prisma 6 + MySQL 8.4. MinIO is used for private file storage.

Companion services run via [docker-compose.yml](docker-compose.yml): `mysql` (port 3307 → 3306) and `minio` (9000/9001).

The repo also contains a non-source `ZHAO 2/` directory and a static `apps/web/Dashboard.html` design reference — neither is part of the build.

## Common Commands

Run from the repo root unless noted.

```bash
npm install              # install all workspaces
npm run db:up            # start MySQL (and Minio) via docker compose
npm run db:generate      # prisma generate (regenerate client)
npm run dev              # web (3000) + backend (3002) together
npm run dev:web          # next dev only
npm run dev:api          # nest start --watch only
npm run build            # build:api then build:web
npm run db:pull          # prisma db pull (introspect)
npm run db:push          # prisma db push (no migration file)
npm run db:migrate       # ⚠️ wrapper hardcodes --name init; for new migrations run prisma directly
npm run db:seed          # node prisma/seed.js
```

Backend-only (run from `apps/backend`):

```bash
npm run lint                       # eslint (TS + Prettier)
npm run typecheck                  # tsc --noEmit -p tsconfig.build.json
npm run test                       # jest (unit, *.spec.ts under src/)
npm run test:e2e                   # jest with test/jest-e2e.json
npx jest path/to/file.spec.ts      # single test file
npx prisma migrate dev --name <descriptive-name>   # new migration (don't use the root db:migrate wrapper)
```

The frontend has **no lint, typecheck, or test scripts** — verify changes by running `npm run dev:web` and exercising the feature in the browser.

## Local URLs / Env

- Web: `http://localhost:3000`
- Backend: `http://localhost:3002/api` (global prefix is set in [main.ts](apps/backend/src/main.ts); change via `API_PREFIX`)
- Health: `GET http://localhost:3002/api/health`
- Frontend reads `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:3002/api`) — see [api-client.ts](apps/web/src/shared/api/api-client.ts).
- Backend env template: [apps/backend/.env.example](apps/backend/.env.example). Note `DATABASE_URL` defaults to port **3306**, but docker-compose maps MySQL to **3307** on the host — adjust your `.env` accordingly, or run against an existing MySQL.

## Backend Architecture

Entry: [app.module.ts](apps/backend/src/app.module.ts) wires these feature modules:
`auth`, `health`, `products`, `restaurants`, `suppliers`, `orders`, `inventory`, `permissions`, `training`, `media` (+ shared `prisma`, `minio`).

Each module follows the Nest layering enforced by [AGENTS.md](AGENTS.md): `controller` (thin) → `service` (business logic) → Prisma (data access). DTOs use `class-validator` and global `ValidationPipe` runs with `whitelist` + `forbidNonWhitelisted`, so unknown fields are rejected.

### Auth & RBAC

[auth.service.ts](apps/backend/src/auth/auth.service.ts) does **not** use a JWT library. Tokens are custom `base64url(payload).hmac-sha256(secret)` strings; passwords use `scrypt` with the format `scrypt$<salt>$<derivedKey>`. Secret comes only from `AUTH_TOKEN_SECRET`; missing configuration is treated as an error. TTL is 8h.

Authorization is RBAC via Prisma tables `Role`, `Permission`, `UserRole`, `RolePermission`. To gate a route:

```ts
@RequirePermissions(TRAINING_MATERIAL_PERMISSIONS.create)
@UseGuards(PermissionGuard)
```

Permission keys live in [permissions.ts](apps/backend/src/auth/permissions.ts). `PermissionGuard` reads the bearer token, resolves the user's permissions via `AuthService.getPermissionsForToken`, and 403s on missing keys.

### Prisma Schema Notes

[schema.prisma](apps/backend/prisma/schema.prisma) maps to a database with mixed French/Chinese column names from a legacy system: e.g. `Supplier` table is `fournisseurs` with column `nom`; `Product` has `nom_cn`, `designation_fr`, `prix_u_ht`. Use the Prisma model field names in code; only map names appear in raw SQL or migrations. `Product.id` and `InventoryMovement.id` are `BigInt` — be careful when serializing to JSON.

Migrations are in `apps/backend/prisma/migrations/`. Three exist as of writing (training RBAC, training positions, purchase orders).

## Frontend Architecture

App Router routes live in [apps/web/app](apps/web/app) (`accept-invitation`, `reset-password`, `dashboard/*`). Feature code lives in `apps/web/src/features/<domain>` (auth, dashboard, inventory, orders, order-history, permissions, profile, stores, suppliers, training). Shared code goes in `apps/web/src/shared`.

Path aliases (see [jsconfig.json](apps/web/jsconfig.json)):

- `@/*` → `./src/*` or `./*`
- `@features/*` → `./src/features/*`
- `@shared/*` → `./src/shared/*`

### Static export implications

`next.config.js` sets `output: 'export'`, so:

- **Every dynamic route (`[id]`, etc.) must export `generateStaticParams`** — Next.js will fail the build otherwise. The training course detail route is a working reference.
- No server actions, no route handlers that read at request time, no middleware-based auth — auth is enforced client-side via `AuthContext` and server-side by the backend on each API call.

### API access

All HTTP calls go through [api-client.js](apps/web/src/shared/api/api-client.js): `apiClient.get/post/patch/put/delete/upload`. It automatically attaches `Authorization: Bearer <token>` and retries once on 401 by calling `/auth/refresh`. Do not write `fetch` calls in feature code; extend or reuse `apiClient`.

Auth state is provided by `AuthProvider` in [layout.js](apps/web/app/layout.js). The token persists in localStorage and is rehydrated on mount.

## Conventions

[AGENTS.md](AGENTS.md) is the authoritative coding standard for this repo (extensive, in Chinese). The high-impact rules:

- Keep controllers thin; business logic lives in services. Don't access Prisma from controllers.
- DTOs validate input only — no business logic. Separate Create/Update/Query DTOs.
- Never expose Prisma entities directly as API responses; map to a view shape.
- File size soft caps: function ≤40 lines, class ≤200 lines, file ≤300 lines, controller ≤150 lines, public methods per class ≤10. Going over requires a stated reason.
- Backend uses Prettier (`singleQuote`, trailing commas) + ESLint with `typescript-eslint` recommended-type-checked. Frontend has no formatter config — match existing 2-space style.
- Naming: avoid `manager`, `handler`, `processor`, `helper`, `common` unless that role genuinely exists.
- Don't fake "tests pass" / "build passes" / "lint passes" in your output unless you actually ran them.

The repo's primary working language with the user is **French** (see user memory). The codebase itself is multilingual: UI copy is trilingual zh/en/fr, comments are mixed, and DB column names are often French.

## Memory

Per-session context is auto-loaded from `~/.claude/projects/-Users-shihongwang-Documents-GitHub-ZHAO-s-Family/memory/`. Use it for prior decisions and ongoing initiatives; verify any specific file/function reference before relying on it.
