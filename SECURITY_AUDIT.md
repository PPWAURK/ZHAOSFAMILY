# ZHAO's Family Security Audit

Date: 2026-06-26

## Overview

Full-stack security audit of the ZHAO's Family monorepo (Next.js + NestJS + MySQL/MinIO). Identified 13 vulnerabilities across severity levels. Phases 1-5 have been implemented and verified.

## Vulnerability Summary

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | CRITICAL | 13 controllers had no authentication | Fixed (Phase 1.1) |
| 2 | CRITICAL | No rate limiting on any endpoint | Fixed (Phase 1.2) |
| 3 | CRITICAL | No file upload MIME validation | Fixed (Phase 2.1) |
| 4 | HIGH | No security HTTP headers | Fixed (Phase 3.1) |
| 5 | HIGH | Access/refresh tokens in localStorage | Pending |
| 6 | HIGH | Hardcoded Docker credentials | Pending |
| 7 | MEDIUM | Mail test endpoints unprotected | Fixed (Phase 1.3) |
| 8 | MEDIUM | `$queryRawUnsafe` SQL injection risk | Fixed (Phase 5.1) |
| 9 | MEDIUM | Prototype pollution in quiz i18n | Fixed (Phase 5.2) |
| 10 | MEDIUM | No XSS sanitization on frontend | Pending |
| 11 | LOW | CORS overly permissive | Pending |
| 12 | LOW | Dependency vulnerabilities | Pending |
| 13 | LOW | No Content-Security-Policy header | Partially fixed (helmet) |

---

## Implemented Fixes

### Phase 1.1 — Global Authentication Guard

Global `AuthGuard` registered as `APP_GUARD`. All routes require a valid Bearer token by default. Public routes are explicitly marked with `@Public()`.

**Files changed:**

| File | Change |
|------|--------|
| `apps/backend/src/auth/decorators/public.decorator.ts` | New `@Public()` decorator |
| `apps/backend/src/auth/guards/auth.guard.ts` | New global AuthGuard using `getCurrentUser()` |
| `apps/backend/src/auth/auth.module.ts` | Register `APP_GUARD` with AuthGuard |
| `apps/backend/src/auth/auth.controller.ts` | Mark 6 public endpoints with `@Public()` |
| `apps/backend/src/health/health.controller.ts` | Mark health check with `@Public()` |

**Public routes after Phase 1.1:**

- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/refresh`
- `POST /auth/accept-invitation`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /health`

### Phase 1.2 — Rate Limiting

Installed `@nestjs/throttler`. Global default: 100 requests/minute. Stricter limits on sensitive auth endpoints.

| File | Change |
|------|--------|
| `apps/backend/src/app.module.ts` | `ThrottlerModule.forRoot()` with 100 req/min default |
| `apps/backend/src/auth/auth.controller.ts` | Per-route `@Throttle()` decorators |

**Auth endpoint limits:**

| Endpoint | Limit |
|----------|-------|
| `POST /auth/login` | 5/min |
| `POST /auth/register` | 3/min |
| `POST /auth/forgot-password` | 3/min |
| `POST /auth/reset-password` | 5/min |
| All other routes | 100/min |

### Phase 1.3 — Mail Endpoint Permission Guard

| File | Change |
|------|--------|
| `apps/backend/src/mail/mail.controller.ts` | Added `PermissionGuard` + `@RequirePermissions('system.permission.manage')` |

Only users with `system.permission.manage` permission can send test emails.

### Phase 2.1 — File Upload MIME Whitelist

| File | Change |
|------|--------|
| `apps/backend/src/media/media.controller.ts` | Added `fileFilter` with MIME whitelist |

**Allowed MIME types:**

- `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- `application/pdf`
- `video/mp4`, `video/quicktime`
- `audio/mpeg`, `audio/mp4`

Upload size limit remains at 5 GB (video support requirement).

### Phase 3.1 — Security HTTP Headers

| File | Change |
|------|--------|
| `apps/backend/src/main.ts` | Added `helmet()` middleware |

Provides: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `X-XSS-Protection`, and more.

### Phase 5.1 — SQL Injection Fix

| File | Change |
|------|--------|
| `apps/backend/src/health/health.service.ts` | `$queryRawUnsafe('SELECT 1')` replaced with `$queryRaw(Prisma.sql\`SELECT 1\`)` |

### Phase 5.2 — Prototype Pollution Fix

| File | Change |
|------|--------|
| `apps/backend/src/training/training-quiz-i18n.ts` | Filter `__proto__`, `constructor`, `prototype` keys in option parsing |

---

## New Dependencies

| Package | Purpose |
|---------|---------|
| `@nestjs/throttler` | Rate limiting |
| `helmet` | Security HTTP headers |

---

## Frontend Impact Analysis

### Definite Breakage

#### 1. `GET /restaurants` — Fixed (Phase 6.3)

Both Web and Mobile call this endpoint before login to populate the restaurant picker during registration. Marked `@Public()` on the list route only (`apps/backend/src/restaurants/restaurants.controller.ts`) — `:id`/`POST`/`PATCH`/`DELETE` remain authenticated. `RestaurantListItem` already only exposes `id/name/address/photoUrl`, so no separate minimal endpoint was needed.

- Web: `apps/web/src/features/auth/hooks/useRegisterStores.ts`
- Mobile: `apps/mobile/src/features/auth/LoginScreen.tsx`

#### 2. `GET /media/file` — Fixed (Phase 6.1)

Browsers render `<img src>`/`<video src>`/`<a href>` without an `Authorization` header, so the global `AuthGuard` 401'd every media load even for authenticated users. Fixed without a full presigned-URL migration:

- `apps/backend/src/media/media.controller.ts` — `getFile` is `@Public()` at the route level but authenticates manually inside the handler: accepts either the `Authorization: Bearer` header or a `?token=` query param, both validated via `AuthService.getCurrentUser`.
- All URL-builder helpers (web: `buildMediaFileUrl` in `apps/web/src/shared/api/api-client.ts`, mobile: inline in `trainingApi.ts` / `caseSharesApi.ts` / `dashboardNewsApi.ts`) now append the current access token as `&token=...`.

**Known trade-off:** this puts the live 8h access token in the URL (server logs, browser history, `Referer` header on cross-origin embeds). Acceptable short-term since all consumption is same-origin/first-party, but the MinIO/R2 presigned-URL flow described above (short-lived, scoped, no full session token) remains the recommended long-term fix — track as a follow-up.

### Edge Case

#### 3. `POST /auth/logout` — Fixed (Phase 6.2)

Marked `@Public()` in `apps/backend/src/auth/auth.controller.ts`. The service (`AuthService.logout`) already validated the refresh token itself (revokes by `tokenHash` match, no-ops if absent/unmatched), so no further change was needed there.

### No Impact

All other API calls are made after login through the shared `apiClient` (Web) / `mobileApiClient` (Mobile). The Axios interceptor automatically attaches Bearer tokens and handles 401 retry with refresh. These endpoints continue to work without changes.

---

## Pending Items

| # | Severity | Issue | Notes |
|---|----------|-------|-------|
| 5 | HIGH | Tokens in localStorage | Requires frontend migration to httpOnly cookies — large scope |
| 6 | HIGH | Hardcoded Docker credentials | Use secrets manager in production |
| 10 | MEDIUM | No frontend XSS sanitization | Add DOMPurify for user-generated content |
| 11 | LOW | CORS overly permissive | Tighten to specific domains |
| 12 | LOW | Dependency vulnerabilities | Run `pnpm audit fix` |
| — | MEDIUM | `/media/file` uses access token in query string | Interim fix (Phase 6.1); migrate to short-lived MinIO/R2 presigned URLs (`POST /media/presign`) to avoid the full session token appearing in URLs/logs |

---

## Verification

- `pnpm build:api` — passed
- Build errors fixed: `PermissionGuard` import path, multer callback signature
- LSP diagnostics: clean (no TypeScript errors)
