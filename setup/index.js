#!/usr/bin/env node

import * as p from '@clack/prompts';
import open from 'open';
import { setTimeout } from 'timers/promises';

p.intro('ash — Self Hosting Harness');

const name = await p.text({
  message: 'What is your name?',
  placeholder: 'your name',
  validate: (val) => {
    if (!val) return 'Name is required';
  },
});

if (p.isCancel(name)) {
  p.cancel('Setup cancelled.');
  process.exit(0);
}

const domain = await p.text({
  message: 'Your domain:',
  placeholder: 'yourdomain.com',
  validate: (val) => {
    if (!val) return 'Domain is required';
    if (!val.includes('.')) return 'Enter a valid domain';
  },
});

if (p.isCancel(domain)) {
  p.cancel('Setup cancelled.');
  process.exit(0);
}

const dnsProvider = await p.select({
  message: 'DNS provider (for wildcard TLS):',
  options: [
    { value: 'route53', label: 'AWS Route 53' },
    { value: 'cloudflare', label: 'Cloudflare' },
    { value: 'manual', label: 'Manual (I\'ll configure DNS myself)' },
  ],
});

if (p.isCancel(dnsProvider)) {
  p.cancel('Setup cancelled.');
  process.exit(0);
}

const services = await p.multiselect({
  message: 'Which services to enable?',
  options: [
    { value: 'code-server', label: 'VS Code Server', hint: 'code.domain.com' },
    { value: 'ollama', label: 'Ollama (local LLM)', hint: 'local inference' },
    { value: 'dsh', label: 'DeepSeek Harness', hint: 'dsh.domain.com' },
    { value: 'webdav', label: 'Obsidian WebDAV', hint: 'obsidian.domain.com' },
  ],
  required: false,
});

if (p.isCancel(services)) {
  p.cancel('Setup cancelled.');
  process.exit(0);
}

const tailscale = await p.confirm({
  message: 'Enable Tailscale (private network)?',
  initialValue: true,
});

if (p.isCancel(tailscale)) {
  p.cancel('Setup cancelled.');
  process.exit(0);
}

// Simulate browser OAuth flow
if (dnsProvider === 'route53') {
  const authAws = await p.confirm({
    message: 'Authenticate with AWS? (opens browser)',
  });

  if (authAws && !p.isCancel(authAws)) {
    const s = p.spinner();
    s.start('Opening browser for AWS authentication...');
    // In real impl: open OAuth URL, start local server for callback
    // await open('https://signin.aws.amazon.com/...');
    await setTimeout(1500);
    s.stop('AWS authentication placeholder (will connect in impl)');
  }
}

// Summary
p.note(
  [
    `Name:       ${name}`,
    `Domain:     ${domain}`,
    `DNS:        ${dnsProvider}`,
    `Services:   ${services.length ? services.join(', ') : 'none'}`,
    `Tailscale:  ${tailscale ? 'yes' : 'no'}`,
  ].join('\n'),
  'Configuration'
);

// Hand off to impl
const s = p.spinner();
s.start('Initializing...');
await setTimeout(1000);
s.stop('Ready');

p.outro(`Hello ${name}! Your harness will be at https://*.${domain}`);
