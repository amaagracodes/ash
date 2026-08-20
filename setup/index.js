#!/usr/bin/env node

/**
 * ash setup — fetches private implementation and executes it.
 * No implementation code lives in this public package.
 */

import { execSync } from 'child_process';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import os from 'os';

const IMPL_REPO = 'amaagracodes/ash-impl';
const IMPL_BRANCH = 'main';

const tmpDir = mkdtempSync(join(os.tmpdir(), 'ash-'));

try {
  execSync(
    `git clone --depth 1 --branch ${IMPL_BRANCH} https://github.com/${IMPL_REPO}.git "${tmpDir}/impl"`,
    { stdio: 'pipe' }
  );

  // Install impl deps
  execSync('npm install --production', { cwd: `${tmpDir}/impl`, stdio: 'pipe' });

  // Run impl
  execSync(`node "${tmpDir}/impl/src/index.js"`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      ASH_USER_DIR: process.cwd(),
    },
  });
} catch (err) {
  if (err.status) process.exit(err.status);
  console.error('  ❌ Setup failed. Check your network and GitHub access.');
  process.exit(1);
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
