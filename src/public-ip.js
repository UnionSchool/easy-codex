import { L } from './language.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { isIP } from 'node:net';
function systemProxy(text) {
  const value = key => text.match(new RegExp(`^\\s*${key} : (.+)$`, 'm'))?.[1].trim();
  if (value('HTTPSEnable') !== '1') return null;
  const host = value('HTTPSProxy');
  const port = Number(value('HTTPSPort'));
  if (!host || !/^[a-zA-Z0-9.:-]+$/.test(host) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(L('系统 HTTPS 代理配置无效。', 'Invalid system HTTPS proxy configuration.'));
  }
  return `http://${host.includes(':') ? `[${host}]` : host}:${port}`;
}


export const PUBLIC_IP_URLS = [
  'https://ipwho.is/',
  'https://get.geojs.io/v1/ip/geo.json',
  'https://ifconfig.co/json'
];

function extractTimeZone(data) {
  if (typeof data?.timezone === 'string') return data.timezone;
  if (typeof data?.timezone?.id === 'string') return data.timezone.id;
  if (typeof data?.time_zone === 'string') return data.time_zone;
  return null;
}

export async function readPublicIP({ run = promisify(execFile), env = process.env, platform = process.platform } = {}) {
  let proxy = env.https_proxy || env.HTTPS_PROXY || env.all_proxy || env.ALL_PROXY;
  if (!proxy && platform === 'darwin') {
    const { stdout } = await run('/usr/sbin/scutil', ['--proxy'], { timeout: 2000, maxBuffer: 65536 });
    proxy = systemProxy(stdout);
  }
  const request = async url => {
    const { stdout } = await run('/usr/bin/curl', ['-q', '--silent', '--show-error', '--fail', '--proto', '=https',
      '--connect-timeout', '5', '--max-time', '12', '--max-redirs', '0', url], {
      timeout: 15000, maxBuffer: 8192, env: proxy ? { ...env, https_proxy: proxy } : env
    });
    return stdout;
  };
  let data = null;
  for (const url of PUBLIC_IP_URLS) {
    try {
      const parsed = JSON.parse(await request(url));
      if (parsed && parsed.success !== false && typeof parsed.ip === 'string' && isIP(parsed.ip)) {
        data = parsed;
        break;
      }
    } catch { /* 尝试下一个备用 IP 接口。 */ }
  }
  if (!data) throw new Error(L('IP异常', 'IP unavailable'));
  const ip = data.ip;
  let city = null, timezone = null;
  if (typeof data.city === 'string') {
    city = data.city.replace(/[\x00-\x1f\x7f-\x9f]/g, ' ').trim().slice(0, 60) || null;
  }
  const rawZone = extractTimeZone(data);
  if (typeof rawZone === 'string' && rawZone.length <= 100) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: rawZone });
      timezone = rawZone;
    } catch { /* 无效时区保持未知，不改用电脑时区。 */ }
  }
  return { ip, city, timezone };
}
