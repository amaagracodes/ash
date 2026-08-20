#!/usr/bin/env node

import { Command } from 'commander';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = await import(join(__dirname, '..', 'package.json'), { with: { type: 'json' } });

const program = new Command();

program
  .name('ash')
  .description('ash — Self Hosting Harness')
  .version(pkg.default.version);

program
  .command('setup')
  .description('Interactive setup wizard — creates volume, configures services')
  .action(async () => {
    await import(join(__dirname, '..', 'setup', 'index.js'));
  });

program
  .command('status')
  .description('Check running services')
  .action(async () => {
    await import(join(__dirname, '..', 'src', 'status.js'));
  });

program
  .command('start')
  .description('Start all services')
  .action(async () => {
    await import(join(__dirname, '..', 'src', 'start.js'));
  });

program
  .command('stop')
  .description('Stop all services')
  .action(async () => {
    await import(join(__dirname, '..', 'src', 'stop.js'));
  });

// Default to setup if no command given
if (!process.argv.slice(2).length) {
  await import(join(__dirname, '..', 'setup', 'index.js'));
} else {
  program.parse();
}
