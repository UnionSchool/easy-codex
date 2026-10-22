import test from 'node:test';
import assert from 'node:assert/strict';
import { overlayData } from '../src/overlay-data.js';
import { readUsage } from '../src/usage.js';

test('浮窗保留独立额度窗口与时间，不混合不同桶', () => {
  const result = overlayData({ rateLimitsByLimitId: {
    codex: { primary: { usedPercent: 45, windowDurationMins: 10080, resetsAt: 1800000000 }, secondary: { usedPercent: null } },
    other: { primary: { usedPercent: 120, windowDurationMins: 300 } },
  }, ordinaryUsageAllowed: false }, 1000);
  assert.equal(result.fetchedAt, 1);
  assert.equal(result.restricted, true);
  assert.equal(result.windows.length, 3);
  assert.deepEqual(result.windows[0], { id: 'codex:primary', label: '7天', windowDurationMins: 10080, name: 'codex · 7天', remaining: 55, resetsAt: 1800000000 });
  assert.equal(result.windows[1].remaining, null);
  assert.equal(result.windows[2].remaining, 0);
  assert.equal(result.windows[2].label, '5小时');
});
test('单桶、缺失数据和无效重置时间', () => {
  assert.throws(() => overlayData({}), /未提供额度/);
  const data = overlayData({ rateLimits: { primary: { usedPercent: -10, resetsAt: 1e30 } } });
  assert.equal(data.windows[0].remaining, 100);
  assert.equal(data.windows[0].resetsAt, null);
  assert.equal(data.windows[0].label, '主窗口');
});
test('退出浮窗可取消正在等待的查询', async () => {
  const controller = new AbortController();
  const promise = readUsage({command: process.execPath, args: ['-e', 'setInterval(()=>{},1000)'], signal: controller.signal});
  controller.abort();
  await assert.rejects(promise, /查询已取消/);
  await assert.rejects(readUsage({signal: controller.signal}), /查询已取消/);
});

test('认证错误码投影白名单，普通查询失败不当作未登录', async () => {
  const {overlayError}=await import('../src/overlay-data.js');
  for(const code of ['auth_required','auth_expired','other',undefined]) {
    assert.deepEqual(overlayError(Object.assign(new Error('safe'),{code})),{error:'safe',errorCode:['auth_required','auth_expired'].includes(code)?code:'query_failed'});
  }
});
