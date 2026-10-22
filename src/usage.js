import { readFileSync } from 'node:fs';
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

// 认证交给官方 CLI；不读取凭据文件，也不转发可能含敏感信息的服务端日志。
export function readUsage({ command = 'codex', args = ['app-server', '--listen', 'stdio://'], timeoutMs = 20000, signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error('查询已取消。')); return; }
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'ignore'], shell: false });
    const lines = createInterface({ input: child.stdout });
    let done = false;
    let expectedId = 1;
    let killTimer;
    const timer = setTimeout(() => finish(new Error('查询超时，请检查网络和 Codex 登录状态。')), timeoutMs);
    function finish(error, result) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      lines.close();
      child.stdin.end();
      child.kill();
      killTimer = setTimeout(() => child.kill('SIGKILL'), 1000);
      killTimer.unref();
      if (error) reject(error);
      else resolve(result);
    }
    function onAbort() { finish(new Error('查询已取消。')); }
    signal?.addEventListener('abort', onAbort, { once: true });
    function send(message) {
      child.stdin.write(`${JSON.stringify(message)}\n`);
    }
    child.on('error', (error) => finish(new Error(error.code === 'ENOENT'
      ? '找不到 codex，请先安装官方 Codex CLI 并确保它位于 PATH 中。'
      : '无法启动 Codex CLI，请检查安装和执行权限。')));
    child.stdin.on('error', () => finish(new Error('Codex 通信中断，请检查 CLI 是否正常。')));
    child.on('close', () => {
      clearTimeout(killTimer);
      finish(new Error('Codex 在返回额度前退出，请检查 CLI 版本、配置和登录状态。'));
    });
    lines.on('line', (line) => {
      if (done) return;
      let message;
      try { message = JSON.parse(line); }
      catch { finish(new Error('Codex 返回了无效的协议数据，请检查 CLI 版本。')); return; }
      if (message?.id !== expectedId) return;
      if (message.error) {
        const authCode = message.error.data?.code ?? message.error.code;
        if (expectedId > 1 && ['token_expired', 'refresh_token_expired', 'refresh_token_reused'].includes(authCode)) {
          finish(Object.assign(new Error('Codex 登录已过期，请执行 codex login。'), { code: 'auth_expired' }));
          return;
        }
        finish(new Error(expectedId === 1
          ? 'Codex 初始化失败，请检查 CLI 版本和配置。'
          : '无法读取额度，请确认已通过 codex login 登录 ChatGPT，并检查网络；API Key 余额不在本工具范围内。'));
        return;
      }
      if (!message.result || typeof message.result !== 'object') {
        finish(new Error('Codex 返回了无效的结果。'));
        return;
      }
      if (expectedId === 1) {
        expectedId = 2;
        send({ method: 'initialized' });
        send({ id: 2, method: 'account/read', params: { refreshToken: false } });
      } else if (expectedId === 2) {
        if (message.result.account === null) {
          finish(Object.assign(new Error('尚未登录 Codex，请执行 codex login。'), { code: 'auth_required' }));
        } else if (message.result.account && typeof message.result.account === 'object') {
          expectedId = 3;
          send({ id: 3, method: 'account/rateLimits/read' });
        } else finish(new Error('无法确认 Codex 账号状态，请检查 CLI 版本。'));
      } else finish(null, message.result);
    });
    send({ id: 1, method: 'initialize', params: {
      clientInfo: { name: 'easy_codex', title: 'Easy Codex', version },
      capabilities: null,
    } });
  });
}

function duration(minutes, fallback) {
  if (!Number.isFinite(minutes) || minutes <= 0) return fallback;
  if (minutes % 1440 === 0) return `${minutes / 1440} 天`;
  if (minutes % 60 === 0) return `${minutes / 60} 小时`;
  return `${minutes} 分钟`;
}

function windowText(window, label) {
  if (!window || typeof window !== 'object') return `  ${label}：未知（未提供数据）`;
  const remaining = Number.isFinite(window.usedPercent)
    ? `${Number(Math.max(0, Math.min(100, 100 - window.usedPercent)).toFixed(1))}%`
    : '未知';
  const date = Number.isFinite(window.resetsAt) ? new Date(window.resetsAt * 1000) : null;
  const reset = date && Number.isFinite(date.getTime()) ? date.toLocaleString('zh-CN', { hour12: false }) : '未知';
  return `  ${duration(window.windowDurationMins, label)}：剩余 ${remaining}；重置 ${reset}`;
}

export function formatUsage(result) {
  if (!result || typeof result !== 'object') throw new Error('额度响应格式无效。');
  const buckets = result.rateLimitsByLimitId;
  const entries = buckets && typeof buckets === 'object' && !Array.isArray(buckets)
    ? Object.entries(buckets).filter(([, value]) => value && typeof value === 'object') : [];
  if (!entries.length && result.rateLimits && typeof result.rateLimits === 'object') {
    entries.push([result.rateLimits.limitId ?? 'codex', result.rateLimits]);
  }
  if (!entries.length) throw new Error('服务端未提供额度数据，无法判断剩余额度。');
  const output = ['Codex 剩余额度（账号共享，非当前会话）'];
  for (const [id, bucket] of entries) {
    // 限制服务端标签中的控制字符，避免终端转义序列影响显示。
    const label = String(bucket.limitName || bucket.limitId || id).replace(/[\x00-\x1f\x7f-\x9f]/g, '');
    output.push(label, windowText(bucket.primary, '主窗口'), windowText(bucket.secondary, '次窗口'));
  }
  if (result.ordinaryUsageAllowed === false) output.push('服务端提示：当前普通额度使用受限。');
  output.push(`重置时间使用本机时区：${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  return output.join('\n');
}
