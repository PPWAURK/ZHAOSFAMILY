#!/usr/bin/env node
/**
 * EAS `eas-build-post-install` hook: removes expo-dev-client from every build
 * except the `development` profile. The dev launcher pulls in ML Kit barcode
 * scanning (~8MB of native libs) that production users never use.
 *
 * Only the installed package link is removed; package.json stays untouched so
 * the frozen lockfile check keeps passing.
 */
const fs = require('fs');
const path = require('path');

const DEV_CLIENT = 'expo-dev-client';

function shouldStripDevClient(env) {
  if (env.STRIP_DEV_CLIENT === '1') return true;

  const profile = env.EAS_BUILD_PROFILE;
  return Boolean(profile) && profile !== 'development';
}

function run() {
  if (!shouldStripDevClient(process.env)) {
    console.log(`[strip-dev-client] keeping ${DEV_CLIENT} for this build`);
    return;
  }

  const projectRoot = path.resolve(__dirname, '..');

  fs.rmSync(path.join(projectRoot, 'node_modules', DEV_CLIENT), {
    force: true,
    recursive: true,
  });
  console.log(`[strip-dev-client] removed ${DEV_CLIENT} from this build`);
}

if (require.main === module) {
  run();
}

module.exports = { shouldStripDevClient };
