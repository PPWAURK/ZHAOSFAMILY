# ZHAO Monitor (macOS app)

A small native macOS app (AppKit + WKWebView) to monitor and operate the
ZHAO deployment from the menu/dock — companion to the CI/CD in `docs/deployment.md`.

## Features

- **Live status** — natively pings (no CORS) the backend health endpoint and the
  web site every 30s; shows up/down, latency, and DB state.
- **One-click CI / CD** — buttons trigger `CI`, `Deploy Backend`, `Deploy Web`
  (or all) via `gh workflow run`. Production deploys show a confirm dialog.
  Uses the locally authenticated `gh` — no token is stored in the app.
- **Live pipeline status** — the pipelines section shows the latest run per
  workflow (queued / in progress / success / failure + time) via `gh run list`,
  auto-refreshing every 30s and after a trigger; click a row to open the run.
- **⚙ Config** — edit the monitored URLs, repo, workflow filenames, deploy ref,
  and SSH connection (for the `.env` editor). Persisted to
  `~/Library/Application Support/ZHAO Monitor/config.json`.
- **🔑 GitHub secrets** — view status (set / when) and overwrite the deploy
  secrets via `gh secret set`. GitHub never returns values, so existing values
  cannot be displayed — only status and overwrite.
- **🖥 Server `.env`** — read and edit the server's `apps/backend/.env` over SSH
  (values are shown; a `.bak` is made on save). Requires the SSH key path
  configured in ⚙.
- **📝 Git** — show local working-tree status and commit / commit + push from the
  app (pushing to main auto-triggers CI/CD). Requires the local repo path in ⚙.

## Build

```bash
./build.sh            # -> build/ZHAO-Monitor.dmg + build/ZHAO Monitor.app
./build.sh --desktop  # also copies both to ~/Desktop
```

Requires Xcode command line tools (`swiftc`, `sips`, `iconutil`, `hdiutil`,
`codesign`). The app is ad-hoc signed; first launch needs right-click → Open
(Gatekeeper, unidentified developer).

## Requirements at runtime

- `gh` installed and authenticated (`gh auth login`) for the trigger / secrets
  buttons.
- An SSH key that can reach the server (for the `.env` editor), path set in ⚙.

## Files

- `src/main.swift` — app (window, live fetch, gh/ssh bridges).
- `src/dashboard.html` — UI rendered in the WKWebView.
- `src/icongen.swift` — generates the app icon (CoreGraphics).
- `build.sh` — compiles, assembles the `.app`, signs, builds the `.dmg`.
