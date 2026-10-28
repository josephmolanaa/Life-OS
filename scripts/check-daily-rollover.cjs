const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const now = '2026-10-22T18:00:00Z'; // Bangkok Oct 23; UTC Oct 22.
class Clock extends Date { constructor(value) { super(value === undefined ? now : value); } static now() { return new Date(now).valueOf(); } }
let rows, race = false, updates = [];
const user = { id: 'owner' };
const client = { auth: { getUser: async () => ({ data: { user } }) }, from() {
 let payload, filters = [];
 const chain = {
  select() { return chain; }, order() { return chain; }, eq(key, value) { filters.push([key, value]); return chain; }, is(key, value) { return chain.eq(key, value); }, update(value) { payload = value; return chain; },
  single() { return execute(true); }, then(resolve, reject) { return execute(false).then(resolve, reject); }
 };
 async function execute(single) {
  if (payload && race) { race = false; rows[0].updated_at = now; rows[0].done = true; }
  const matches = rows.filter(row => filters.every(([key, value]) => row[key] === value));
  if (payload) { updates.push({ payload, filters }); matches.forEach(row => Object.assign(row, payload)); }
  const data = matches.map(row => ({ ...row }));
  return { data: single ? data[0] : data, error: null };
 }
 return chain;
} };
function load(file) {
 const exports = {};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Date: Clock, Intl, URL, require: name => name === 'next/server' ? { NextResponse: { json: (value, options = {}) => ({ value, status: options.status || 200 }) } } : { createClient: async () => client } });
 return exports;
}
const { GET } = load('src/app/api/todos/route.ts');
const { PUT } = load('src/app/api/todos/[id]/route.ts');
const todoId = '12345678-1234-1234-1234-123456789012';
const reset = () => { updates = []; rows = [{ id: todoId, user_id: 'owner', list_kind: 'daily', label: 'Read', done: true, updated_at: '2026-10-22T12:00:00Z', created_at: '2026-10-20T12:00:00Z' }]; };
const request = zone => ({ url: `https://example.test/api/todos?timeZone=${encodeURIComponent(zone)}` });
(async () => {
 reset(); assert.equal((await GET(request('UTC'))).value[0].done, true);
 assert.equal((await GET(request('Asia/Bangkok'))).value[0].done, false, 'User midnight resets while UTC still yesterday');
 assert.ok(updates[0].filters.some(([key]) => key === 'updated_at'));
 reset(); race = true; assert.equal((await GET(request('Asia/Bangkok'))).value[0].done, true, 'Concurrent completion survives stale rollover');
 assert.equal(rows[0].updated_at, now);
 assert.equal((await GET(request('Invalid/Zone'))).status, 400);
 reset(); await PUT({ json: async () => ({ label: 'Renamed' }) }, { params: Promise.resolve({ id: todoId }) });
 assert.equal(rows[0].updated_at, '2026-10-22T12:00:00Z', 'Metadata edit cannot renew yesterday completion');
 assert.equal((await GET(request('Asia/Bangkok'))).value[0].done, false);
 reset(); await PUT({ json: async () => ({ done: true }) }, { params: Promise.resolve({ id: todoId }) });
 assert.equal(rows[0].updated_at, new Date(now).toISOString());
 console.log('Daily rollover: local midnight, invalid zone, concurrent completion, metadata timestamp, explicit completion passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
