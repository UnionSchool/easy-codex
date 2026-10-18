#!/usr/bin/env node
import { readFileSync } from 'node:fs';
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
import { readUsage, formatUsage } from '../src/usage.js';

const args = process.argv.slice(2);
if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
  console.log('用法：easy-codex [usage|show|overlay]\n显示已登录 Codex 账号的剩余百分比和重置时间。需要官方 Codex CLI。');
} else if (args.length === 1 && ['--version', '-v'].includes(args[0])) {
  console.log(version);
} else if (args.length === 1 && ['show', 'overlay'].includes(args[0])) {
  try { const { launchOverlay } = await import('../src/overlay.js'); await launchOverlay(); }
  catch (error) { console.error(`easy-codex: ${error.message}`); process.exitCode = 1; }
} else if (args.length === 0 || (args.length === 1 && args[0] === 'usage')) {
  try { console.log(formatUsage(await readUsage())); }
  catch (error) { console.error(`easy-codex: ${error.message}`); process.exitCode = 1; }
} else {
  console.error('未知参数。用法：easy-codex [usage|show|overlay]，或 easy-codex --help');
  process.exitCode = 1;
}
