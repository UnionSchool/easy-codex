import test from 'node:test';
import assert from 'node:assert/strict';
import { readUsage, formatUsage } from '../src/usage.js';

const sample = { rateLimits: { primary: { usedPercent: 25, windowDurationMins: 300, resetsAt: 1800000000 }, secondary: null } };
const fakeArgs = (body) => ['--input-type=module', '-e', `
import { createInterface } from 'node:readline';
createInterface({ input: process.stdin }).on('line', line => {
  const m = JSON.parse(line);
  ${body}
});`];

test('计算剩余百分比，缺失窗口不伪装为零或满额', () => {
  const text = formatUsage(sample);
  assert.match(text, /5 小时：剩余 75%/);
  assert.match(text, /次窗口：未知/);
  assert.doesNotMatch(text, /Invalid Date/);
});
test('优先显示全部额度桶；百分比边界和未知字段', () => {
  const text = formatUsage({ ...sample, ordinaryUsageAllowed: false, rateLimitsByLimitId: {
    a: { primary: { usedPercent: 105 }, secondary: { usedPercent: -5 } },
    b: { primary: { usedPercent: null, resetsAt: 1e30 } },
  } });
  assert.match(text, /剩余 0%/);
  assert.match(text, /剩余 100%/);
  assert.match(text, /剩余 未知；重置 未知/);
  assert.match(text, /普通额度使用受限/);
  assert.doesNotMatch(text, /75%/);
  assert.throws(() => formatUsage({}), /未提供额度/);
});
test('先握手再查询，忽略通知并正常结束进程', async () => {
  const args = fakeArgs(`
    if (m.id === 1) console.log(JSON.stringify({id: 1, result: {}}));
    if (m.method === 'initialized') globalThis.ready = true;
    if (m.id === 2 && m.method === 'account/read') console.log(JSON.stringify({id:2,result:{account:{type:'chatgpt'}}}));
    if (m.id === 3 && globalThis.ready && m.method === 'account/rateLimits/read') {
      console.log(JSON.stringify({method: 'notice'}));
      console.log(JSON.stringify({id: 3, result: ${JSON.stringify(sample)}}));
    }
  `);
  assert.deepEqual(await readUsage({command: process.execPath, args}), sample);
});
test('错误响应不泄露服务端原始信息', async () => {
  const args = fakeArgs(`console.log(JSON.stringify({id:m.id,error:{message:'secret-token'}}));`);
  await assert.rejects(readUsage({command: process.execPath, args}), error => !error.message.includes('secret-token') && /初始化失败/.test(error.message));
});
test('找不到 CLI', async () => {
  await assert.rejects(readUsage({command: '/nonexistent/easy-codex-cli'}), /找不到 codex/);
});
test('超时与提前退出均报告失败', async () => {
  await assert.rejects(readUsage({command: process.execPath, args: ['-e', 'setInterval(()=>{},1000)'], timeoutMs: 100}), /超时/);
  await assert.rejects(readUsage({command: process.execPath, args: ['-e', 'process.exit(0)']}), /返回额度前退出/);
});
test('额度请求失败和损坏协议均明确报错', async () => {
  const args = fakeArgs(`
    if (m.id === 1) console.log(JSON.stringify({id:1,result:{}}));
    if (m.id === 2) console.log(JSON.stringify({id:2,error:{message:'secret'}}));
  `);
  await assert.rejects(readUsage({command: process.execPath, args}), /无法读取额度/);
  await assert.rejects(readUsage({command: process.execPath, args: fakeArgs("console.log('not json');")}), /无效的协议/);
});

test('明确空账号才判未登录，账号查询失败仍为普通失败', async () => {
  for (const [result, code] of [[{account:null}, 'auth_required'], [{}, undefined]]) {
    const args = fakeArgs(`if (m.id === 1) console.log(JSON.stringify({id:1,result:{}}));if (m.id === 2) console.log(JSON.stringify({id:2,result:${JSON.stringify(result)}}));`);
    await assert.rejects(readUsage({command:process.execPath,args}), error => error.code === code);
  }
});

test('只按明确认证错误码判断过期，不转发原始错误', async () => {
 const args=fakeArgs(`if(m.id===1)console.log(JSON.stringify({id:1,result:{}}));if(m.id===2)console.log(JSON.stringify({id:2,error:{message:'secret',data:{code:'token_expired'}}}));`);
 await assert.rejects(readUsage({command:process.execPath,args}),e=>e.code==='auth_expired'&&!e.message.includes('secret'));
});
