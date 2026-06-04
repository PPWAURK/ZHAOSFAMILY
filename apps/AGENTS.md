# Repository Guidelines

## Project Structure & Module Organization
This repository contains three apps and shared packages:

- `web/`: Next.js frontend. App Router entry points live in `web/app`, feature code in `web/src/features`, shared API helpers in `web/src/shared`, and static assets in `web/public`.
- `mobile/`: Expo React Native app. Routes live in `mobile/app`, feature code in `mobile/src/features`, and platform-specific providers in `mobile/src/providers`.
- `backend/`: NestJS backend. Business modules live in `backend/src/*`, shared guards/decorators in `backend/src/common`, Prisma schema and seed files in `backend/prisma`, and e2e tests in `backend/test`.
- `../packages/*`: Shared API clients, DTOs, auth orchestration, and pure utilities. Do not share UI components between Web and Mobile.

## Build, Test, and Development Commands
Run pnpm commands from the repository root.

- `pnpm dev:web`: start the Next.js dev server.
- `pnpm dev:mobile`: start Expo.
- `pnpm dev:api`: start the NestJS API in watch mode.
- `pnpm build:web`: build the web app.
- `pnpm build:api`: compile the backend.
- `pnpm --filter backend test`: run backend unit tests.
- `pnpm --filter backend test:e2e`: run backend e2e tests.
- `pnpm db:generate` or `pnpm db:migrate`: update Prisma client/schema artifacts.

## Coding Style & Naming Conventions
Follow existing module boundaries: thin controllers, business logic in services, UI composition in pages/screens, reusable logic in hooks/services.

- Use 2-space indentation in `web` and the repo’s existing TS style in `api`.
- Backend formatting is enforced by Prettier (`singleQuote: true`, trailing commas enabled) and ESLint in `api/eslint.config.mjs`.
- Use clear names such as `AuthLandingPage`, `UsersService`, `CreateInvitationDto`, `useLiaoSwing`.

## Testing Guidelines
Backend tests use Jest. Unit tests follow `*.spec.ts` under `backend/src`; e2e tests live in `backend/test`. Add or update tests for service logic, auth flows, and DTO validation. Mobile uses Jest Expo. The frontend currently has no dedicated component test suite, so record manual verification steps in PRs that change `web`.

## Commit & Pull Request Guidelines
Git history is minimal (`Initial project import`), so no strong legacy convention exists yet. Prefer short, imperative, scope-first commit messages such as `api: add invitation expiry check` or `web: refine auth landing layout`.

PRs should include:

- a brief summary of the user-facing or API change,
- affected areas (`web`, `api`, Prisma, auth, etc.),
- screenshots for UI changes,
- sample request/response notes for API changes,
- any required env or migration steps.

## Security & Configuration Tips
Do not commit secrets. Keep env-specific values in local env files, validate backend input with DTOs, and avoid exposing raw internal errors or database details in API responses.
