#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const path = require('path');

const command = process.argv[2];

if (!command || command === 'setup') {
  require(path.join(__dirname, '..', 'setup', 'index.js'));
} else {
  console.log(`ash: unknown command '${command}'`);
  console.log('Usage: ash setup');
  process.exit(1);
}
