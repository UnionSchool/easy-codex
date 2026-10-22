#!/usr/bin/env node
import { L } from '../src/language.js';
import { readFileSync } from 'node:fs';
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
import { readUsage, formatUsage } from '../src/usage.js';

const args = process.argv.slice(2);
if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
  console.log(L('用法：easy-codex [usage|show|overlay|update|agent mcp|agent worker 配置路径 [--check|--once]]\n显示已登录 Codex 账号的剩余百分比和重置时间。需要官方 Codex CLI。', 'Usage: easy-codex [usage|show|overlay|update|agent mcp|agent worker config-path [--check|--once]]\nShow remaining usage and reset times. Requires the official Codex CLI login.'));
} else if (args.length === 1 && ['--version', '-v', '-V'].includes(args[0])) {
  console.log(version);
} else if (args.length === 1 && ['show', 'overlay'].includes(args[0])) {
  try { const { launchOverlay } = await import('../src/overlay.js'); await launchOverlay(); }
  catch (error) { console.error(`easy-codex: ${error.message}`); process.exitCode = 1; }
} else if (args.length === 1 && args[0] === 'update') {
  try { const { updateAndShow } = await import('../src/overlay-update.js'); await updateAndShow(); }
  catch (error) { console.error(`easy-codex: ${error.message}`); process.exitCode = 1; }
} else if (args[0] === 'agent') {
  try { const { runAgent } = await import('../src/agent.js'); await runAgent(args.slice(1), 'codex'); }
  catch (error) { console.error(`easy-codex: ${error.message}`); process.exitCode = 1; }
} else if (args.length === 0 || (args.length === 1 && args[0] === 'usage')) {
  try { console.log(formatUsage(await readUsage())); }
  catch (error) { console.error(`easy-codex: ${error.message}`); process.exitCode = 1; }
} else {
  console.error(L('未知参数。用法：easy-codex [usage|show|overlay|update|agent mcp|agent worker 配置路径 [--check|--once]]，或 easy-codex --help', 'Unknown argument. Usage: easy-codex [usage|show|overlay|update|agent mcp|agent worker config-path [--check|--once]]; or easy-codex --help'));
  process.exitCode = 1;
}
