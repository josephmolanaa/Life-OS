const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

let user = { id: 'user-a', email: 'a@example.test' };
let rows = [];
let failure = null;
const queries = [];
const client = {
  auth: { getUser: async () => ({ data: { user } }) },
  from(table) {
    assert.equal(table, 'diary_entries');
    const query = { operation: 'select', filters: [], payload: null };
    queries.push(query);
    const chain = {
      select() { return chain; },
      order() { return chain; },
      eq(key, value) { query.filters.push([key, value]); return chain; },
      insert(payload) { query.operation = 'insert'; query.payload = payload; return chain; },
      update(payload) { query.operation = 'update'; query.payload = payload; return chain; },
      delete() { query.operation = 'delete'; return chain; },
      maybeSingle() { return execute(true); },
      then(resolve, reject) { return execute(false).then(resolve, reject); },
    };
    async function execute(single) {
      if (failure) return { data: null, error: { code: failure } };
      const matches = rows.filter(row => query.filters.every(([key, value]) => row[key] === value));
      let data;
      if (query.operation === 'insert') {
        if (rows.some(row => row.user_id === query.payload.user_id && row.date === query.payload.date)) return { data: null, error: { code: '23505' } };
        rows.push({ ...query.payload });
        data = [rows.at(-1)];
      } else if (query.operation === 'update') {
        matches.forEach(row => Object.assign(row, query.payload));
        data = matches;
      } else if (query.operation === 'delete') {
        rows = rows.filter(row => !matches.includes(row));
        data = matches;
      } else data = matches.sort((a, b) => b.date.localeCompare(a.date));
      return { data: single ? data[0] ?? null : data, error: null };
    }
    return chain;
  },
};
const source = fs.readFileSync(path.join(__dirname, '../src/app/api/diary/route.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {}, Date, Set, Number, require: name => {
  if (name === 'next/server') return { NextResponse: { json: (value, options = {}) => ({ status: options.status ?? 200, value }) } };
  if (name === '@/lib/supabase/server') return { createClient: async () => client };
  throw new Error(`Unexpected import: ${name}`);
} };
vm.runInNewContext(compiled, context);
const { GET, PUT, DELETE } = context.exports;
const request = value => ({ json: async () => value });
const initial = { date: '2026-10-11', text: ' My day ', mood: 'Good', userId: 'user-a', expectedUpdated: null };

(async () => {
  user = null;
  assert.equal((await GET()).status, 401);
  assert.equal((await PUT(request(initial))).status, 401);
  assert.equal((await DELETE(request({ ...initial, expectedUpdated: '2026-10-11T00:00:00Z' }))).status, 401);
  user = { id: 'user-a', email: 'a@example.test' };
  assert.equal((await PUT({ json: async () => { throw Error('bad JSON'); } })).status, 400);
  for (const value of [null, [], 'text', {}, { ...initial, date: '2026-02-30' }, { ...initial, text: ' ' }, { ...initial, text: 'a'.repeat(100001) }, { ...initial, mood: 'invalid' }, { ...initial, expectedUpdated: undefined }]) {
    assert.equal((await PUT(request(value))).status, 400);
  }
  assert.equal((await DELETE(request(initial))).status, 400);
  assert.equal((await PUT(request({ ...initial, userId: 'user-b' }))).status, 403);
  assert.equal((await DELETE(request({ ...initial, userId: 'user-b', expectedUpdated: '2026-10-11T00:00:00Z' }))).status, 403);
  const saved = await PUT(request(initial));
  assert.equal(saved.status, 200);
  assert.equal(saved.value.text, 'My day');
  assert.equal(rows[0].user_id, 'user-a');
  assert.equal((await PUT(request(initial))).status, 409);
  rows.push({ ...rows[0], user_id: 'user-b', text: 'Private' });
  const loaded = await GET();
  assert.equal(loaded.value.entries.length, 1);
  assert.equal(loaded.value.entries[0].text, 'My day');
  assert.equal(loaded.value.user.id, 'user-a');
  const stale = '2020-01-01T00:00:00Z';
  assert.equal((await PUT(request({ ...initial, expectedUpdated: stale }))).status, 409);
  const updated = await PUT(request({ ...initial, text: 'Changed', expectedUpdated: saved.value.updated }));
  assert.equal(updated.status, 200);
  assert.notEqual(updated.value.updated, saved.value.updated);
  assert.equal(rows.find(row => row.user_id === 'user-b').text, 'Private');
  assert.equal((await DELETE(request({ ...initial, expectedUpdated: saved.value.updated }))).status, 409);
  assert.equal((await DELETE(request({ ...initial, expectedUpdated: updated.value.updated }))).status, 200);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].user_id, 'user-b');
  for (const code of ['PGRST205', '42P01', 'XX000']) {
    failure = code;
    const expected = code === 'XX000' ? 500 : 503;
    assert.equal((await GET()).status, expected);
    assert.equal((await PUT(request(initial))).status, expected);
    assert.equal((await DELETE(request({ ...initial, expectedUpdated: updated.value.updated }))).status, expected);
  }
  for (const query of queries.filter(query => query.operation !== 'insert')) {
    assert.ok(query.filters.some(([key, value]) => key === 'user_id' && value === 'user-a'));
    if (query.operation === 'update' || query.operation === 'delete') assert.ok(query.filters.some(([key]) => key === 'updated_at'));
  }
  console.log('Diary API checks passed (mock database; no live writes).');
})().catch(error => { console.error(error); process.exitCode = 1; });
