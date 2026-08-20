#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

const IMPL_REPO = 'amaagracodes/selfhosted-impl';
const IMPL_BRANCH = 'main';

console.log(`
  ╔══════════════════════════════════════════╗
  ║          ash — AI Studio Harness         ║
  ║    Self-hosted AI dev environment        ║
  ╚══════════════════════════════════════════╝
`);

console.log('  Fetching setup runtime...');

// Execute impl from a temp dir that gets cleaned up — no code stays on disk
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ash-'));

try {
  execSync(
    `git clone --depth 1 --branch ${IMPL_BRANCH} https://github.com/${IMPL_REPO}.git "${tmpDir}/impl" 2>/dev/null`,
    { stdio: 'pipe' }
  );

  // Run the impl entry point
  execSync(`node "${tmpDir}/impl/src/index.js"`, {
    stdio: 'inherit',
    env: { ...process.env, ASH_USER_DIR: process.cwd() },
  });
} catch (err) {
  if (err.status) {
    process.exit(err.status);
  }
  console.error('  ❌ Failed to fetch runtime. Check your network and GitHub access.');
  process.exit(1);
} finally {
  // Clean up — no impl code remains
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
