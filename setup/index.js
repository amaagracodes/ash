#!/usr/bin/env node

import * as p from '@clack/prompts';
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import os from 'os';
import { setTimeout } from 'timers/promises';

// --- System requirements ---
const MIN_RAM_GB = 8;
const MIN_DISK_GB = 50;

function getSystemInfo() {
  const platform = os.platform();
  const arch = os.arch();
  const totalRamGB = Math.round(os.totalmem() / 1024 / 1024 / 1024);

  let availDiskGB = 0;
  try {
    const df = execSync("df -g / | tail -1 | awk '{print $4}'", { encoding: 'utf-8' }).trim();
    availDiskGB = parseInt(df, 10);
  } catch {
    availDiskGB = -1;
  }

  return { platform, arch, totalRamGB, availDiskGB };
}

function checkSystemRequirements() {
  const { platform, arch, totalRamGB, availDiskGB } = getSystemInfo();

  if (platform !== 'darwin') {
    p.cancel(`ash currently supports macOS only. Detected: ${platform}`);
    console.log('  Windows and Linux support coming soon.');
    process.exit(1);
  }

  if (arch !== 'arm64' && arch !== 'x64') {
    p.cancel(`Unsupported architecture: ${arch}`);
    process.exit(1);
  }

  const issues = [];

  if (totalRamGB < MIN_RAM_GB) {
    issues.push(`RAM: ${totalRamGB}GB available, ${MIN_RAM_GB}GB required`);
  }

  if (availDiskGB >= 0 && availDiskGB < MIN_DISK_GB) {
    issues.push(`Disk: ${availDiskGB}GB free, ${MIN_DISK_GB}GB required`);
  }

  return { platform, arch, totalRamGB, availDiskGB, issues };
}

// --- Volume creation ---
function createSparseBundle(name, sizeGB, mountPoint) {
  const bundlePath = `/Volumes/${mountPoint}/${name}.sparsebundle`;

  if (existsSync(bundlePath)) {
    return { bundlePath, alreadyExists: true };
  }

  try {
    execSync(
      `hdiutil create -size ${sizeGB}g -type SPARSEBUNDLE -fs APFS -volname "${name}" "${bundlePath}"`,
      { stdio: 'pipe' }
    );
    return { bundlePath, alreadyExists: false };
  } catch (err) {
    throw new Error(`Failed to create volume: ${err.message}`);
  }
}

function mountVolume(bundlePath) {
  try {
    execSync(`hdiutil attach "${bundlePath}" -nobrowse`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// --- Main setup flow ---
async function main() {
  p.intro('ash — Self Hosting Harness');

  // System check
  const sys = checkSystemRequirements();

  if (sys.issues.length > 0) {
    p.cancel('System requirements not met:');
    sys.issues.forEach((issue) => console.log(`  ❌ ${issue}`));
    process.exit(1);
  }

  p.log.success(`macOS ${sys.arch} | ${sys.totalRamGB}GB RAM | ${sys.availDiskGB}GB disk free`);

  // Username
  const username = await p.text({
    message: 'Choose a studio name:',
    placeholder: 'studio',
    initialValue: 'studio',
    validate: (val) => {
      if (!val) return 'Name is required';
      if (!/^[a-z0-9_-]+$/.test(val)) return 'Lowercase letters, numbers, hyphens, underscores only';
    },
  });

  if (p.isCancel(username)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  // Volume location
  const volumes = [];
  try {
    const rawVolumes = execSync("ls /Volumes", { encoding: 'utf-8' }).trim().split('\n');
    rawVolumes.forEach((v) => {
      if (v && v !== 'Macintosh HD' && v !== 'Recovery') {
        volumes.push(v);
      }
    });
  } catch {}

  let volumeTarget;

  if (volumes.length > 0) {
    volumeTarget = await p.select({
      message: 'Where to create the harness volume?',
      options: [
        ...volumes.map((v) => ({ value: v, label: `/Volumes/${v}`, hint: 'external' })),
        { value: '__local__', label: 'Local disk (~)', hint: 'internal SSD' },
      ],
    });
  } else {
    volumeTarget = '__local__';
  }

  if (p.isCancel(volumeTarget)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  // Volume size
  const volumeSize = await p.text({
    message: 'Volume size (GB):',
    placeholder: '50',
    initialValue: '50',
    validate: (val) => {
      const n = parseInt(val, 10);
      if (isNaN(n) || n < 20) return 'Minimum 20GB';
      if (n > 500) return 'Maximum 500GB';
    },
  });

  if (p.isCancel(volumeSize)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  // Create volume
  const s = p.spinner();
  s.start(`Creating ${username} volume (${volumeSize}GB sparsebundle)...`);

  try {
    const targetPath = volumeTarget === '__local__' ? os.homedir() : `/Volumes/${volumeTarget}`;
    const bundleName = `${username}-workspace`;

    // Check if target directory exists
    if (!existsSync(targetPath)) {
      throw new Error(`Target path ${targetPath} not found. Is the disk mounted?`);
    }

    const bundlePath = `${targetPath}/${bundleName}.sparsebundle`;

    if (existsSync(bundlePath)) {
      s.stop(`Volume already exists at ${bundlePath}`);
    } else {
      execSync(
        `hdiutil create -size ${volumeSize}g -type SPARSEBUNDLE -fs APFS -volname "${bundleName}" "${bundlePath}"`,
        { stdio: 'pipe' }
      );
      s.stop(`Volume created: ${bundlePath}`);
    }

    // Mount
    const mountSpinner = p.spinner();
    mountSpinner.start('Mounting volume...');

    const mountPoint = `/Volumes/${bundleName}`;
    if (!existsSync(mountPoint)) {
      execSync(`hdiutil attach "${bundlePath}" -nobrowse`, { stdio: 'pipe' });
    }
    mountSpinner.stop(`Mounted at ${mountPoint}`);

    // Create base directory structure
    const dirSpinner = p.spinner();
    dirSpinner.start('Creating directory structure...');

    const dirs = ['infra/bin', 'infra/generated', 'infra/caddy_data', 'infra/caddy_config'];
    dirs.forEach((dir) => {
      const full = `${mountPoint}/${dir}`;
      if (!existsSync(full)) mkdirSync(full, { recursive: true });
    });

    dirSpinner.stop('Directory structure created');

    // Summary
    p.note(
      [
        `Studio:     ${username}`,
        `Volume:     ${bundlePath}`,
        `Mounted:    ${mountPoint}`,
        `Size:       ${volumeSize}GB (sparse — grows on demand)`,
        '',
        'Structure:',
        `  ${mountPoint}/infra/        — orchestration, Caddy, env`,
        `  ${mountPoint}/<service>/    — each service gets a folder + Config`,
      ].join('\n'),
      'Your Harness'
    );

    p.outro(`✅ ${username} harness ready at ${mountPoint}`);
  } catch (err) {
    s.stop('Failed');
    p.cancel(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
