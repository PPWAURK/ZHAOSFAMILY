// Cross-platform wrapper: `VAR=value cmd` does not work in Windows cmd, so the
// default API base URL is injected here before delegating to `tauri build`.
import { spawnSync } from 'node:child_process';

const DEFAULT_API_BASE_URL = 'https://api.zhaosfamily.com/api';

const env = {
  ...process.env,
  NEXT_PUBLIC_API_BASE_URL:
    process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL,
};

const result = spawnSync(
  'pnpm',
  ['exec', 'tauri', 'build', ...process.argv.slice(2)],
  { stdio: 'inherit', env, shell: process.platform === 'win32' },
);

if (result.error) {
  console.error(result.error.message);
}
process.exit(result.status ?? 1);
