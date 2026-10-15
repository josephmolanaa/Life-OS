const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { loadEnvConfig } = require('@next/env');
const { createServerClient } = require('@supabase/ssr');

loadEnvConfig(process.cwd());
const email = process.env.LIFE_OS_TEST_EMAIL;
const password = process.env.LIFE_OS_TEST_PASSWORD;
const baseUrl = new URL(process.env.LIFE_OS_TEST_BASE_URL || 'http://localhost:3001');
if (!email || !password) throw new Error('Set LIFE_OS_TEST_EMAIL and LIFE_OS_TEST_PASSWORD for this live, self-cleaning check.');
if (baseUrl.protocol !== 'http:' || !['localhost', '127.0.0.1', '::1'].includes(baseUrl.hostname)) {
  throw new Error('Live checks must target the local app.');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Supabase public URL/key are missing from the local Next environment.');
}

const cookies = new Map();
async function call(path, body, method = body === undefined ? 'GET' : 'POST') {
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers: {
      ...(cookies.size ? { cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; ') } : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  for (const item of response.headers.getSetCookie()) {
    const first = item.split(';', 1)[0];
    const separator = first.indexOf('=');
    if (separator < 1) continue;
    const name = first.slice(0, separator);
    const value = first.slice(separator + 1);
    if (value) cookies.set(name, value);
    else cookies.delete(name);
  }
  return { status: response.status, value: await response.json().catch(() => null) };
}

async function main() {
  const login = await call('/api/auth/login', { email, password });
  assert.equal(login.status, 200, 'The supplied account must sign in to the local app.');

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: items => items.forEach(({ name, value, options }) => options.maxAge === 0 ? cookies.delete(name) : cookies.set(name, value)),
    },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  assert.ok(user && !authError, 'The server-side session must resolve to the signed-in account.');

  const marker = `Todo check ${crypto.randomUUID()}`;
  const ids = [];
  try {
    for (const list_kind of ['daily', 'task']) {
      const created = await call('/api/todos', { label: marker, list_kind, priority: 'HIGH', done: true });
      assert.equal(created.status, 201, created.value?.error);
      ids.push(created.value.id);
      assert.equal(created.value.user_id, user.id);
    }
    const duplicate = await call('/api/todos', { label: marker, list_kind: 'task' });
    assert.equal(duplicate.status, 409);
    for (const invalid of [{ label: '' }, { label: marker, priority: 'URGENT' }, { label: marker, list_kind: 'other' }, { label: marker, done: 'yes' }]) {
      assert.equal((await call('/api/todos', invalid)).status, 400);
    }
    for (const [index, kind] of ['daily', 'task'].entries()) {
      const read = await call(`/api/todos?kind=${kind}`);
      assert.equal(read.status, 200);
      assert.ok(read.value.some(row => row.id === ids[index]));
      assert.ok(!read.value.some(row => row.id === ids[1 - index]), 'Daily quests and tasks must be separate.');
    }
    const updated = await call(`/api/todos/${ids[1]}`, { priority: 'LOW', done: false }, 'PUT');
    assert.equal(updated.status, 200);
    const { data: persisted, error } = await supabase.from('todos').select('*').eq('id', ids[1]).single();
    assert.ifError(error);
    assert.equal(persisted.priority, 'LOW');
    assert.equal(persisted.done, false);
    const reload = await call('/api/todos?kind=task');
    assert.equal(reload.value.find(row => row.id === ids[1]).priority, 'LOW');
    assert.equal((await call(`/api/todos/${ids[1]}`, { done: 'false' }, 'PUT')).status, 400);
    const { error: rlsError } = await supabase.from('todos').insert({ user_id: '00000000-0000-0000-0000-000000000000', label: marker, list_kind: 'task' });
    assert.equal(rlsError?.code, '42501', 'RLS must prevent foreign-owned inserts.');
    const unauthenticated = await fetch(new URL('/api/todos?kind=task', baseUrl));
    assert.equal(unauthenticated.status, 401);
  } finally {
    for (const id of ids) {
      assert.equal((await call(`/api/todos/${id}`, undefined, 'DELETE')).status, 200);
      const { data, error } = await supabase.from('todos').select('id').eq('id', id);
      assert.ifError(error);
      assert.deepEqual(data, [], 'Temporary row must be removed.');
    }
    await supabase.auth.signOut({ scope: 'local' });
    cookies.clear();
  }
}
main().then(
  () => console.log('Live Todo passed: separate lists, CRUD, reload, priority, validation, duplicate handling, owner RLS and cleanup.'),
  error => { console.error(error.message); process.exitCode = 1; },
);
