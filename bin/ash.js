#!/usr/bin/env node

import { Command } from 'commander';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const program = new Command();

program
  .name('ash')
  .description('ash — Self Hosting Harness')
  .version(pkg.version);

program
  .command('setup')
  .description('Interactive setup wizard')
  .action(async () => {
    await import(join(__dirname, '..', 'setup', 'index.js'));
  });

program
  .command('clean')
  .description('Remove state, caches, or providers')
  .option('--providers', 'remove provider configs')
  .option('--cache', 'clear generated files + caddy data')
  .option('--services', 'stop + remove service dirs')
  .option('--all', 'full reset (keeps ash.json)')
  .action(async (opts) => {
    await import(join(__dirname, '..', 'setup', 'index.js'));
  });

program
  .command('start')
  .description('Start all services')
  .action(async () => {
    await import(join(__dirname, '..', 'setup', 'index.js'));
  });

program
  .command('stop')
  .description('Stop all services')
  .action(async () => {
    await import(join(__dirname, '..', 'setup', 'index.js'));
  });

program
  .command('sync')
  .description('Propagate ash.json to all service configs')
  .action(async () => {
    await import(join(__dirname, '..', 'setup', 'index.js'));
  });

program
  .command('status')
  .description('Show running services')
  .action(async () => {
    await import(join(__dirname, '..', 'setup', 'index.js'));
  });

// Default to setup
if (!process.argv.slice(2).length) {
  await import(join(__dirname, '..', 'setup', 'index.js'));
} else {
  program.parse();
}
