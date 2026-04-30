# ZHAO's Family

ZHAO's Family is a monorepo for the internal restaurant operations platform.
It contains a Next.js web app and a NestJS backend API.

## Stack

- Frontend: Next.js
- Backend: NestJS
- Database: MySQL with Prisma
- Language: JavaScript / TypeScript
- Package manager: npm workspaces

## Project Structure

```text
apps/
  web/       Next.js dashboard and feature pages
  backend/   NestJS API, Prisma schema, migrations, services, controllers
```

## Local Setup

Install dependencies:

```bash
npm install
```

Start MySQL:

```bash
npm run db:up
```

Generate Prisma client:

```bash
npm run db:generate
```

Start the web app and API together:

```bash
npm run dev
```

Run only one side:

```bash
npm run dev:web
npm run dev:api
```

## Useful Commands

```bash
npm run build
npm run build:web
npm run build:api
npm run db:pull
npm run db:push
npm run db:migrate
npm run db:seed
```

## Local URLs

- Web app: `http://localhost:3000`
- Backend API: `http://localhost:3002/api`
- Healthcheck: `http://localhost:3002/api/health`

## Notes

- Keep environment-specific values in local `.env` files.
- Do not commit database backups, credentials, tokens, or production secrets.
- Backend implementation should keep controllers thin and business logic in services.
- Frontend implementation should keep API access in shared services and feature modules.
