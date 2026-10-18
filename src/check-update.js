import { checkUpdate } from './update.js';
try { console.log(JSON.stringify(await checkUpdate('easy-codex'))); }
catch { process.exitCode = 1; }
