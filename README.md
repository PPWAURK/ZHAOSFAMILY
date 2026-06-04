# ZHAO's Family

ZHAO's Family is a monorepo for the internal restaurant operations platform.
It contains a Next.js web app, a React Native mobile app, and a NestJS backend API.

## Stack

- Web frontend: Next.js App Router
- Mobile frontend: Expo + React Native
- Backend: NestJS
- Database: MySQL with Prisma
- Language: JavaScript / TypeScript
- Package manager: pnpm workspaces
- Shared client state: Zustand
- Server state: TanStack Query
- HTTP client: Axios

## Project Structure

```text
apps/
  web/        Next.js dashboard and feature pages
  mobile/     Expo iOS and Android app
  backend/    NestJS API, Prisma schema, migrations, services, controllers
packages/
  api/        Shared Axios client, API modules, query keys
  auth/       Shared auth store and auth action orchestration
  types/      Shared DTOs, API contracts, view-safe public types
  utils/      Shared pure utilities
```

## Local Setup

Enable pnpm with Corepack:

```bash
corepack enable
corepack prepare pnpm@11.1.3 --activate
```

Install dependencies:

```bash
pnpm install
```

Start MySQL:

```bash
pnpm db:up
```

Generate Prisma client:

```bash
pnpm db:generate
```

Start the web app and API together:

```bash
pnpm dev
```

Run only one side:

```bash
pnpm dev:web
pnpm dev:api
```

Start the Expo app:

```bash
pnpm dev:mobile
```

Run native development builds after platform tooling is installed:

```bash
pnpm mobile:android
pnpm mobile:ios
```

## Useful Commands

```bash
pnpm build
pnpm build:web
pnpm build:api
pnpm typecheck
pnpm lint
pnpm mobile:test
pnpm mobile:lint
pnpm db:pull
pnpm db:push
pnpm db:migrate
pnpm db:seed
```

## Local URLs

- Web app: `http://localhost:3000`
- Mobile app: `apps/mobile`
- Backend API: `http://localhost:3002/api`
- Healthcheck: `http://localhost:3002/api/health`

## Architecture Rules

- Keep UI separate per platform. Web and Mobile do not share UI components.
- Share DTOs, API clients, query keys, auth orchestration, and pure business utilities through `packages/*`.
- Keep feature-specific API calls in package modules or feature services, not inside screens.
- Keep environment variables platform-specific: `NEXT_PUBLIC_*` for Web and `EXPO_PUBLIC_*` for Mobile.
- Keep future Docker and CI/CD entry points at the workspace root so app packages stay deployable independently.

## Notes

- Keep environment-specific values in local `.env` files.
- Do not commit database backups, credentials, tokens, or production secrets.
- Backend implementation should keep controllers thin and business logic in services.
- Frontend implementation should keep API access in shared services and feature modules.
- Frontend work should follow `apps/web/FRONTEND_STANDARDS.md`.
- Mobile native builds require Expo-compatible native tooling: JDK and Android Studio for Android, Xcode and CocoaPods for iOS.
