const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const mainSource = fs.readFileSync(path.join(root, 'electron/main.cjs'), 'utf8');
const preloadSource = fs.readFileSync(path.join(root, 'electron/preload.cjs'), 'utf8');
for (const channel of ['lifeos:activity-status', 'lifeos:activity-set', 'lifeos:activity-data']) {
  assert.ok(mainSource.includes(channel), `Missing desktop handler: ${channel}`);
  assert.ok(preloadSource.includes(channel), `Missing preload bridge: ${channel}`);
}
for (const name of ['LIFE_OS_DESKTOP_ACTIVITY', 'LIFE_OS_ACTIVITY_SECRET', 'LIFE_OS_ACTIVITY_PERMISSIONS']) {
  assert.ok(mainSource.includes(name), `Missing desktop server environment: ${name}`);
}
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'lifeos-consent-test-'));
const originalLoad = Module._load;
let user = { id: 'account-a', email: 'test@example.invalid' };
let cacheReads = 0, cacheWrites = 0, watcherReads = 0;
const supabase = {
  auth: { getUser: async () => ({ data: { user } }) },
  from: () => ({ select: () => ({ eq: () => ({ eq: async () => ({ data: [] }) }) }) }),
};
const loaded = new Map();
function load(relative) {
  if (loaded.has(relative)) return loaded.get(relative);
  const filename = path.join(root, relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const instance = new Module(filename, module);
  instance.filename = filename;
  instance.paths = Module._nodeModulePaths(path.dirname(filename));
  instance._compile(compiled, filename);
  loaded.set(relative, instance.exports);
  return instance.exports;
}
Module._load = function(request, parent, isMain) {
  if (request === '@/lib/supabase/server') return { createClient: async () => supabase };
  if (request === '@/lib/activitywatch-cache') return {
    saveActivityEventsToCache: async () => { cacheWrites++; },
    fetchActivityFromCache: async () => { cacheReads++; return []; },
  };
  if (request === '@/lib/activitywatch-rules') return { applyActivityRules: items => items.map(item => ({ ...item, category: 'work' })) };
  if (request === '@/lib/activitywatch-permissions') return load('src/lib/activitywatch-permissions.ts');
  return originalLoad.call(this, request, parent, isMain);
};
process.env.LIFE_OS_DESKTOP_ACTIVITY = '1';
process.env.LIFE_OS_ACTIVITY_SECRET = 'test-only-secret';
process.env.LIFE_OS_ACTIVITY_PERMISSIONS = path.join(temp, 'permissions.json');
const originalFetch = global.fetch;
global.fetch = async url => {
  watcherReads++;
  return Response.json(String(url).includes('/events?')
    ? [{ data: { app: 'Test app', title: 'Synthetic title' }, timestamp: '2026-10-27T10:00:00Z', duration: 60 }]
    : { 'aw-watcher-window-test': { hostname: 'Test PC' } });
};
const request = (route, method = 'GET', body, secret = 'test-only-secret') => new Request(`http://127.0.0.1:63027/api/${route}`, {
  method, headers: { 'x-lifeos-activity': secret, 'Content-Type': 'application/json' },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
(async () => {
  const store = load('src/lib/activitywatch-permissions.ts');
  const permission = load('src/app/api/activitywatch-permission/route.ts');
  const data = load('src/app/api/activitywatch-data/route.ts');
  const date = 'activitywatch-data?date=2026-10-27&range=1d';
  assert.equal((await permission.GET(request('activitywatch-permission', 'GET', undefined, 'wrong'))).status, 403);
  user = null;
  assert.equal((await permission.GET(request('activitywatch-permission'))).status, 401);
  assert.equal((await data.GET(request(date))).status, 401);
  user = { id: 'account-a' };
  assert.equal((await data.GET(request(date))).status, 403);
  assert.equal(watcherReads, 0);
  assert.equal((await permission.POST(request('activitywatch-permission', 'POST', { allowed: true, userId: 'account-b' }))).status, 200);
  assert.equal(store.hasActivityPermission('account-a'), true);
  assert.equal(store.hasActivityPermission('account-b'), false);
  loaded.delete('src/lib/activitywatch-permissions.ts');
  assert.equal(load('src/lib/activitywatch-permissions.ts').hasActivityPermission('account-a'), true, 'grant persists across module reload');
  assert.equal((await data.GET(request('activitywatch-data?date=2026-02-30&range=1d'))).status, 400);
  assert.equal((await data.GET(request('activitywatch-data?range=invalid'))).status, 400);
  assert.equal((await data.GET(request(date, 'GET', undefined, 'wrong'))).status, 403);
  assert.equal((await (await data.GET(request(date))).json()).hostname, 'Test PC');
  assert.equal(cacheReads, 0); assert.equal(cacheWrites, 0);
  user = { id: 'account-b' };
  assert.equal((await data.GET(request(date))).status, 403);
  user = { id: 'account-a' };
  global.fetch = async () => { throw new Error('offline'); };
  assert.deepEqual((await (await data.GET(request(date))).json()).items, []);
  assert.equal(cacheReads, 0); assert.equal(cacheWrites, 0);
  assert.equal((await permission.POST(request('activitywatch-permission', 'POST', { allowed: false }))).status, 200);
  assert.equal((await data.GET(request(date))).status, 403);
  assert.equal((await permission.POST(request('activitywatch-permission', 'POST', { allowed: 'yes' }))).status, 400);
  assert.equal((await permission.POST(request('activitywatch-permission', 'POST', null))).status, 400);
  assert.equal((await permission.POST(request('activitywatch-permission', 'POST'))).status, 400);
  fs.writeFileSync(process.env.LIFE_OS_ACTIVITY_PERMISSIONS, '{bad');
  assert.equal((await permission.GET(request('activitywatch-permission'))).status, 503);
  assert.equal((await data.GET(request(date))).status, 503);
  assert.throws(() => store.setActivityPermission('account-a', true));
  process.env.LIFE_OS_ACTIVITY_PERMISSIONS = temp;
  assert.throws(() => store.setActivityPermission('account-a', true));
  process.env.LIFE_OS_DESKTOP_ACTIVITY = '0';
  assert.equal((await permission.GET(request('activitywatch-permission'))).status, 403);
  process.env.ACTIVITYWATCH_OWNER_ID = 'different-owner';
  delete process.env.ACTIVITYWATCH_OWNER_EMAIL;
  watcherReads = 0;
  await data.GET(request(date));
  assert.equal(watcherReads, 0, 'web retains owner gate');
  console.log('ActivityWatch permission checks passed: auth, trusted channel, account isolation, persistence, revoke, invalid inputs, corrupt storage, offline, no desktop cloud IO, web owner gate.');
})().finally(() => {
  global.fetch = originalFetch;
  Module._load = originalLoad;
  fs.rmSync(temp, { recursive: true, force: true });
}).catch(error => { console.error(error); process.exitCode = 1; });
