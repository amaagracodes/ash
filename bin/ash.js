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

// Default to setup if no command given
if (!process.argv.slice(2).length) {
  await import(join(__dirname, '..', 'setup', 'index.js'));
} else {
  program.parse();
}
