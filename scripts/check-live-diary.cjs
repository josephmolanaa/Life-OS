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

  const loadedBefore = await call('/api/diary');
  assert.equal(loadedBefore.status, 200, 'Diary GET must read the authenticated account.');
  const freeDates = Array.from({ length: 28 }, (_, index) => `1901-01-${String(index + 1).padStart(2, '0')}`)
    .filter(date => !loadedBefore.value.entries.some(entry => entry.date === date));
  assert.ok(freeDates.length, 'All dedicated test dates are already occupied; no database writes were made.');
  const date = freeDates[crypto.randomInt(freeDates.length)];
  const marker = `Life OS live database check ${crypto.randomUUID()}`;
  let attemptedInsert = false;

  try {
    attemptedInsert = true;
    const created = await call('/api/diary', { date, text: marker, mood: 'Okay', userId: user.id, expectedUpdated: null }, 'PUT');
    assert.equal(created.status, 200, `Diary insert failed: ${created.value?.error || created.status}`);
    assert.equal(created.value.text, marker);

    const { data: persisted, error: readError } = await supabase.from('diary_entries')
      .select('date,text,mood,updated_at').eq('user_id', user.id).eq('date', date).maybeSingle();
    assert.ifError(readError);
    assert.equal(persisted?.text, marker, 'Supabase must return the inserted row independently of the route response.');

    const reloaded = await call('/api/diary');
    assert.equal(reloaded.status, 200);
    assert.equal(reloaded.value.entries.find(entry => entry.date === date)?.text, marker, 'A separate GET must return the saved entry.');

    const updated = await call('/api/diary', { date, text: marker, mood: 'Good', userId: user.id, expectedUpdated: created.value.updated }, 'PUT');
    assert.equal(updated.status, 200, 'Versioned updates must succeed.');
    assert.equal(updated.value.mood, 'Good');
    const stale = await call('/api/diary', { date, text: 'stale write', mood: 'Okay', userId: user.id, expectedUpdated: created.value.updated }, 'PUT');
    assert.equal(stale.status, 409, 'Stale writes must be rejected.');
    const staleDelete = await call('/api/diary', { date, userId: user.id, expectedUpdated: created.value.updated }, 'DELETE');
    assert.equal(staleDelete.status, 409, 'Stale deletion must preserve the newer version.');

    const { error: foreignOwnerError } = await supabase.from('diary_entries').insert({
      user_id: '00000000-0000-0000-0000-000000000000', date, text: marker, mood: 'Okay',
    });
    assert.equal(foreignOwnerError?.code, '42501', 'RLS must reject a write owned by another user.');
  } finally {
    if (attemptedInsert) {
      const latest = await call('/api/diary');
      const current = latest.value?.entries?.find(entry => entry.date === date);
      if (current?.text === marker) {
        const removed = await call('/api/diary', { date, userId: user.id, expectedUpdated: current.updated }, 'DELETE');
        assert.equal(removed.status, 200, 'Could not remove the temporary test entry.');
        const finalRead = await call('/api/diary');
        assert.ok(!finalRead.value.entries.some(entry => entry.date === date), 'Temporary test entry remains in the diary.');
      } else if (current) {
        throw new Error('Cleanup stopped because the test row changed; it was preserved for review.');
      }
    }
    await supabase.auth.signOut({ scope: 'local' });
    cookies.clear();
  }
}

main().then(
  () => console.log('Live diary check passed: session, Supabase insert/read, route reload, optimistic conflict, owner RLS and cleanup.'),
  error => { console.error(error.message); process.exitCode = 1; },
);
