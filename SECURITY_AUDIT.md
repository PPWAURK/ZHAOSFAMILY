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

---

# Deep Scan — Round 2 (2026-06-29)

Second-pass audit going beyond the authentication layer fixed in Phases 1-5. Five parallel agents covered backend authorization/IDOR, frontend XSS/token handling, secrets/config/infra, auth-flow/input-validation, and dependency CVEs, plus a `pnpm audit` run. Focus: authorization (a logged-in user from restaurant A must not access restaurant B's data), session lifecycle, secrets, and supply chain.

> Note: `apps/backend/.env` is **not** git-tracked (verified via `git ls-files`); the real risks are the weak placeholder secret shipped in tracked `.env.example` files plus the local plaintext secrets. Verify git history to confirm secrets were never committed.

## P0 — Fix Immediately (directly exploitable / data exposure)

| # | Vulnerability | Location | Fix |
|---|---------------|----------|-----|
| P0-1 | **`GET /media/file` arbitrary object read (IDOR)** — any authenticated user who guesses an `objectKey` can stream any training/news/case-share/ABC file. No ownership/scope check. | `media.controller.ts:120`, `media.service.ts:102,134` | Store per-object owner/scope metadata and enforce before read, or migrate to short-lived scoped signed URLs |
| P0-2 | **ABC score cross-restaurant write (IDOR)** — `restaurantId` fully caller-controlled; any holder of a fill permission can modify any store's scores/media | `abc-scores.controller.ts:80,96,112`, `abc-scores.service.ts:118,372,457` | Inject caller's restaurant scope; reject any `restaurantId` outside it |
| P0-3 | **Secret governance** — weak signing secret `change_this_local_secret` shipped in `.env.example`; local `.env` holds real Brevo/SMTP/AI/DB/MinIO keys | `.env:4`, `.env.example:7`, root `.env.example:8` | Audit git history; rotate all real keys; reject placeholder secrets at startup |

## P1 — High (auth / authorization / token leakage / CVE)

| # | Vulnerability | Location | Fix |
|---|---------------|----------|-----|
| P1-4 | **Bearer token in URL `?token=`** — web+mobile media URLs leak the live access token via history/logs/Referer (already documented as the Phase 6.1 interim trade-off) | `api-client.ts:69`, mobile `dashboardNewsApi`/`trainingApi`/`caseSharesApi` | Replace with Authorization-header fetch + object URL, or signed URLs |
| P1-5 | **Web tokens in localStorage/sessionStorage** — any XSS = full session theft | `AuthContext.tsx:24,38` | Move refresh token to HttpOnly+Secure+SameSite cookie |
| P1-6 | **Mobile arbitrary PDF URL exfiltrates token** — backend-supplied absolute URL reused with `Authorization` header for download/share | `orders/orderApi.ts:209,240,250` | Allow only same-origin/order-API URLs; never send auth headers to backend-provided absolute URLs |
| P1-7 | **Session lifecycle flaws** — refresh rotation race + no reuse detection + password change does not revoke existing sessions | `auth.service.ts:315,465,555,599` | Conditional revoke-and-rotate in one transaction; add session family; delete all refresh sessions on password change |
| P1-8 | **Permissions module cross-tenant** — any `system.permission.manage` holder can rewrite any user's roles/managed restaurants and enumerate all users | `permissions.controller.ts:34,63,86` + service | Pass viewer scope; restrict to HQ; validate target ownership on writes |
| P1-9 | **Recruitment request cross-store management** — `recruitment.request.manage` becomes org-wide list/update/delete | `recruitment-requests.controller.ts:42,53,66` | Scope to managed restaurants + validate target request ownership |
| P1-10 | **Training out-of-plan progression / title farming** — trusts `materialId`+`userId`, no plan-membership check | `training.controller.ts:210,235` + quiz/title services | Resolve caller-allowed material set; reject actions outside it |
| P1-11 | **Order visibility privilege bleed** — `system.permission.manage` treated as holding-wide order read | `orders.service.ts:298,313,661` | Remove that permission from order visibility checks |
| P1-12 | **`POST /media/upload` arbitrary `folder`** — low-priv user can plant objects under trusted prefixes | `media.controller.ts:83`, `media.service.ts:53` | Server-issued upload intents / per-permission folder allowlist |
| P1-13 | **Multer 2.1.1 CVE** (GHSA-72gw-mp4g-v24j, GHSA-3p4h-7m6x-2hcm — DoS) | `apps/backend/package.json` | Upgrade `multer>=2.2.0`; add field-nesting/field-count limits |
| P1-14 | **axios transitive `form-data 4.0.5` CVE** (GHSA-hmw2-7cc7-3qxx) | web/mobile/api | pnpm override `form-data>=4.0.6` |
| P1-15 | **Hardcoded Docker credentials** — MySQL/MinIO default passwords | `docker-compose.yml:14,34` | Move to external env/secrets; non-default per environment |

## P2 — Medium

| Vulnerability | Location | Fix |
|---------------|----------|-----|
| Mutating endpoints missing `@RequirePermissions` (PermissionGuard returns `true` with no metadata): dashboard-news publish/delete, permissions job-role/approval/delete | authz report #17-21 | Add explicit permission decorators |
| 5 GB upload limit → disk-exhaustion DoS | `media.controller.ts:26` | Lower limit sharply + per-type caps + upload-specific throttle |
| Access token not revocable (8h TTL, valid after logout/password change) | `auth.service.ts:33,329` | Add tokenVersion/jti revocation or shorten TTL |
| Login / forgot-password timing enumeration | `auth.service.ts:283,400` | Dummy scrypt on miss path; equalize latency |
| No account lockout (IP throttle only) | `auth.controller.ts:26` | Per-account failure counter / backoff / lockout |
| Quiz duplicate `questionId` score inflation | `submit-quiz-attempt.dto.ts`, `training-quiz.service.ts:179` | Enforce unique questionId in DTO/service |
| Registration self-sets `level`/`restaurantId` | `register.dto.ts:55`, `auth.service.ts:244` | Ignore client `level`; assign restaurant via approval |
| postcss transitive CVE (GHSA-qx2v-qp2m-jg93) | next dependency tree | Upgrade next / override `postcss>=8.5.10` |
| Unsanitized dashboard markdown image rendering | `DashboardNewsModule.js:112` | Same-origin/objectKey allowlist or strict sanitize |
| Password-reset debug mode returns live reset link | `auth.service.ts:436` | Hard-disable outside dev |
| No proxy-aware throttling / no web security headers | `main.ts`, `next.config.js` | Backend trust-proxy + custom tracker; enforce headers at CDN (static export) |

## P3 — Low

Raw backend error strings shown to users (`AcceptInvitationPageContent.js:55`, `ResetPasswordPageContent.js:62`, mobile auth screens); email PII in logs (`auth.service.ts:431`); CORS fail-open defaults (`main.ts:8`); docs repeat DB passwords (`README.md:222`, `apps/backend/README.md:17`); DTO validation gaps (`sizeBytes`, inventory `delta`, quiz arrays, mail DTO); training library overexposed (`training.service.ts:416`); whitespace-only name passes validation (`accept-invitation.dto.ts:9`); assorted auth-only writes (orders/waiting-queue/case-shares/notifications — most already scoped in service layer).

## Recommended Execution Order

1. **P0** — media access control, ABC authorization scope, secret rotation
2. **P1 auth/token chain** (P1-4 to P1-7) and **authorization** (P1-8 to P1-11)
3. **Dependency CVEs** (P1-13 to P1-15) — fast, can run in parallel
4. **P2/P3** — hardening pass

## Negative Findings (confirmed safe)

- No `dangerouslySetInnerHTML` / `innerHTML` / `eval` / `document.write` in frontend
- No runtime `$queryRawUnsafe` / `$executeRawUnsafe` (only test mocks; health check uses safe `Prisma.sql`)
- No CORS wildcard
- Password hashes & token signatures use constant-time comparison; reset/invitation tokens stored hashed and single-use
- No git-tracked frontend `.env` secrets
- Next.js `^15.5.0` is above the CVE-2025-29927 middleware-bypass fix floor (and app uses static `output: 'export'`)
