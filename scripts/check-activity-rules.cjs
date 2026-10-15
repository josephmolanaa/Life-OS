const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

let user = null;
let result = { data: [], error: null };
let reads = 0;
const query = {
  select() { return this; },
  eq() { return this; },
  order: async () => { reads++; return result; },
};
const client = {
  auth: { getUser: async () => ({ data: { user } }) },
  from: () => query,
};
const context = { exports: {}, require: name => {
  if (name === 'next/server') return { NextResponse: { json: (value, options = {}) => ({ value, status: options.status ?? 200 }) } };
  if (name === '@/lib/supabase/server') return { createClient: async () => client };
  return require(name);
} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/activity-rules/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, context);

(async () => {
  const { GET } = context.exports;
  assert.equal((await GET()).status, 401);
  assert.equal(reads, 0, 'Unauthenticated request must not query rules');
  user = { id: 'account-a' };
  result = { data: null, error: { message: 'private database detail' } };
  const failed = await GET();
  assert.equal(failed.status, 500);
  assert.equal(failed.value.error, 'Unable to load activity rules');
  result = { data: [], error: null };
  assert.equal((await GET()).status, 200, 'Empty data is distinct from a database failure');
  result = { data: [{ id: 'rule-a' }], error: null };
  assert.equal((await GET()).value[0].id, 'rule-a');
  console.log('Activity rules: authentication, database failure and empty/success responses OK');
})().catch(error => { console.error(error); process.exitCode = 1; });
