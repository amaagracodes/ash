#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const command = process.argv[2] || 'setup';

if (command === 'setup') {
  await import(join(__dirname, '..', 'setup', 'index.js'));
} else {
  console.log(`ash: unknown command '${command}'`);
  console.log('Usage: ash setup');
  process.exit(1);
}
