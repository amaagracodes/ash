#!/usr/bin/env node

/**
 * ash setup — downloads the runtime binary and executes it.
 * No source code is distributed.
 */

import { execSync } from 'child_process';
import { createWriteStream, mkdtempSync, rmSync, existsSync, chmodSync } from 'fs';
import { join } from 'path';
import { get } from 'https';
import os from 'os';

const REPO = 'amaagracodes/ash-impl';
const arch = os.arch() === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
const BINARY_NAME = `ash-runtime-${arch}`;

// Resolve latest release URL
const RELEASE_URL = `https://github.com/${REPO}/releases/latest/download/${BINARY_NAME}`;

const tmpDir = mkdtempSync(join(os.tmpdir(), 'ash-'));
const binaryPath = join(tmpDir, 'ash-runtime');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const follow = (url) => {
      get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          follow(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }
        const file = createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
        file.on('error', reject);
      }).on('error', reject);
    };
    follow(url);
  });
}

try {
  process.stdout.write('  Downloading ash runtime...');
  await download(RELEASE_URL, binaryPath);
  chmodSync(binaryPath, 0o755);
  process.stdout.write(' done\n');

  // Execute
  execSync(binaryPath, {
    stdio: 'inherit',
    env: { ...process.env, ASH_USER_DIR: process.cwd() },
  });
} catch (err) {
  // Fallback: clone and run (for development / pre-release)
  console.log('\n  Binary not available — falling back to source...');
  try {
    execSync(
      `git clone --depth 1 --branch main https://github.com/${REPO}.git "${tmpDir}/impl"`,
      { stdio: 'pipe' }
    );
    execSync('npm install --production', { cwd: `${tmpDir}/impl`, stdio: 'pipe' });
    execSync(`node "${tmpDir}/impl/src/index.js"`, {
      stdio: 'inherit',
      env: { ...process.env, ASH_USER_DIR: process.cwd() },
    });
  } catch (e) {
    if (e.status) process.exit(e.status);
    console.error('  ❌ Setup failed. Check network and GitHub access.');
    process.exit(1);
  }
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
