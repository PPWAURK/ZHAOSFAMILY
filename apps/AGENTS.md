# Repository Guidelines

## Project Structure & Module Organization
This repository contains two apps:

- `web/`: Next.js frontend. App Router entry points live in `web/app`, feature code in `web/src/features`, shared API helpers in `web/src/shared`, and static assets in `web/public`.
- `api/`: NestJS backend. Business modules live in `api/src/*`, shared guards/decorators in `api/src/common`, Prisma schema and seed files in `api/prisma`, and e2e tests in `api/test`.

## Build, Test, and Development Commands
Run commands from the relevant app directory.

- `cd web && npm run dev`: start the Next.js dev server.
- `cd web && npm run build && npm run start`: build and serve production output.
- `cd api && npm run start:dev`: start the NestJS API in watch mode.
- `cd api && npm run build`: compile the backend.
- `cd api && npm run test`: run unit tests.
- `cd api && npm run test:e2e`: run e2e tests from `api/test`.
- `cd api && npm run test:cov`: generate coverage output.
- `cd api && npm run prisma:generate` or `npm run prisma:migrate`: update Prisma client/schema artifacts.

## Coding Style & Naming Conventions
Follow existing module boundaries: thin controllers, business logic in services, UI composition in pages/screens, reusable logic in hooks/services.

- Use 2-space indentation in `web` and the repo’s existing TS style in `api`.
- Backend formatting is enforced by Prettier (`singleQuote: true`, trailing commas enabled) and ESLint in `api/eslint.config.mjs`.
- Use clear names such as `AuthLandingPage`, `UsersService`, `CreateInvitationDto`, `useLiaoSwing`.

## Testing Guidelines
Backend tests use Jest. Unit tests follow `*.spec.ts` under `api/src`; e2e tests live in `api/test`. Add or update tests for service logic, auth flows, and DTO validation. The frontend currently has no dedicated test script, so record manual verification steps in PRs that change `web`.

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
