#!/usr/bin/env node
/**
 * JS→TS ratchet guard.
 *
 * FRONTEND_STANDARDS.md (§3, §15) requires new code to be `.ts`/`.tsx` and
 * allows only gradual, decreasing migration of the existing `.js`/`.jsx` files.
 * This script fails if the number of `.js`/`.jsx` files under `src/` + `app/`
 * exceeds the baseline — i.e. it blocks *new* JavaScript from being added while
 * leaving the existing files to be migrated over time.
 *
 * When you migrate a file JS→TS, LOWER `BASELINE` to match. Never raise it.
 */
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASELINE = 111;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIRS = ["src", "app"];
const SKIP_DIRS = new Set(["node_modules", ".next", "out"]);

function countJs(dir) {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      count += countJs(join(dir, entry.name));
    } else if (/\.(js|jsx)$/.test(entry.name)) {
      count += 1;
    }
  }
  return count;
}

let total = 0;
for (const dir of DIRS) {
  try {
    total += countJs(join(ROOT, dir));
  } catch {
    // directory may not exist in some configurations — ignore
  }
}

if (total > BASELINE) {
  console.error(
    `✗ JS→TS ratchet: ${total} .js/.jsx files under src/ + app/, baseline is ${BASELINE}.\n` +
      `  New code must be TypeScript (FRONTEND_STANDARDS.md §3, §15).\n` +
      `  Fix: author the new file as .ts/.tsx. If you intentionally migrated\n` +
      `  files JS→TS, lower BASELINE in apps/web/scripts/check-no-new-js.mjs.`,
  );
  process.exit(1);
}

console.log(
  `✓ JS→TS ratchet: ${total}/${BASELINE} .js/.jsx files (not increasing).`,
);
