const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const instant = '2026-10-22T02:00:00Z'; // Bangkok Oct 22; fixed UTC-7 Oct 21.
class Clock extends Date { constructor(value) { super(value === undefined ? instant : value); } }
let writes = [];
const exportsMock = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/discipline/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
 exports: exportsMock, Date: Clock, Intl,
 require: name => name === 'next/server' ? { NextResponse: { json: (value, options = {}) => ({ value, status: options.status ?? 200 }) } } : { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) }, from: () => ({ upsert: async row => { writes.push(row); return {}; } }) }) }
});
const scores = { total: 50, physique: 50, habits: 50, social: 50, career: 50 };
const post = body => exportsMock.POST({ json: async () => ({ ...scores, ...body }) });
(async () => {
 for (const [timeZone, today, yesterday] of [['Asia/Bangkok', '2026-10-22', '2026-10-21'], ['Etc/GMT+7', '2026-10-21', '2026-10-20']]) {
  assert.equal((await post({ timeZone, date: today })).status, 200);
  assert.equal(writes.at(-1).date, today);
  const count = writes.length;
  assert.equal((await post({ timeZone, date: yesterday })).status, 400);
  assert.equal((await post({ timeZone, date: '2026-02-30' })).status, 400);
  assert.equal(writes.length, count);
 }
 assert.equal((await post({ timeZone: 'Invalid/Zone', date: '2026-10-22' })).status, 400);
 assert.equal((await post({ timeZone: 7, date: '2026-10-22' })).status, 400);
 assert.equal((await post({ date: '2026-10-21' })).status, 400);
 console.log('Discipline calendar: UTC+7 / UTC-7 today accepted, yesterday/invalid dates/invalid zones rejected.');
})().catch(error => { console.error(error); process.exitCode = 1; });
