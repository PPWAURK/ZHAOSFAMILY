# ZHAO's Family Mobile

Expo React Native app for iOS and Android.

## Local Commands

Run from the repository root:

```bash
pnpm dev:mobile
pnpm mobile:android
pnpm mobile:ios
pnpm mobile:test
pnpm mobile:lint
```

## Structure

```text
app/                 Expo Router routes
src/features/        Mobile-only screens and UI
src/lib/             Mobile API and secure storage wiring
src/providers/       Query and app-level providers
src/styles/          NativeWind global styles
```

Business DTOs, API client code, auth actions, and utilities are shared from `packages/*`.
UI components are intentionally mobile-only.
