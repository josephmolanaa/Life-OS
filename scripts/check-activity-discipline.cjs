const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, imports, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const context = { exports: {}, require: name => imports[name] ?? require(name), ...globals };
  vm.runInNewContext(source, context);
  return context.exports;
}

let user = null;
let authFails = false;
let liveReads = 0;
let cacheReads = 0;
const env = {};
const client = {
  auth: { getUser: async () => {
    if (authFails) throw new Error('Auth down');
    return { data: { user } };
  } },
  from: () => ({ select: () => ({ eq: () => ({ eq: async () => ({ data: [] }) }) }) }),
};
const { GET } = load('src/app/api/activitywatch-data/route.ts', {
  'next/server': { NextResponse: { json: (value, options = {}) => ({ value, status: options.status ?? 200 }) } },
  '@/lib/supabase/server': { createClient: async () => client },
  '@/lib/activitywatch-rules': { applyActivityRules: items => items },
  '@/lib/activitywatch-cache': {
    saveActivityEventsToCache: async () => {},
    fetchActivityFromCache: async (_, id) => {
      assert.equal(id, user.id);
      cacheReads++;
      return [];
    },
  },
}, {
  URL, AbortController, setTimeout, clearTimeout, process: { env },
  fetch: async () => { liveReads++; throw new Error('Watcher offline'); },
});

(async () => {
  const request = { url: 'http://localhost/api/activitywatch-data?range=1d' };
  assert.equal((await GET(request)).status, 401);
  assert.equal(liveReads + cacheReads, 0);
  authFails = true;
  assert.equal((await GET(request)).status, 503);
  assert.equal(liveReads + cacheReads, 0);
  authFails = false;
  user = { id: 'account-a' };
  assert.equal((await GET(request)).status, 200);
  assert.equal(liveReads, 0);
  env.ACTIVITYWATCH_OWNER_ID = 'account-b';
  await GET(request);
  assert.equal(liveReads, 0);
  env.ACTIVITYWATCH_OWNER_ID = user.id;
  await GET(request);
  assert.equal(liveReads, 1);
  env.ACTIVITYWATCH_OWNER_ID = '';
  env.ACTIVITYWATCH_OWNER_EMAIL = 'OWNER@EXAMPLE.COM';
  user.email = 'owner@example.com';
  await GET(request);
  assert.equal(liveReads, 2);
  env.ACTIVITYWATCH_OWNER_EMAIL = '';
  user.email = 'different@example.com';
  await GET(request);
  assert.equal(liveReads, 2);
  assert.equal((await GET({ url: request.url + '&date=2026-02-30' })).status, 400);

  const now = new Date();
  now.setDate(now.getDate() - 1);
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const states = [{ disciplineTitle: 'Discipline', disciplineToday: 'Today', pillarBreakdown: 'Pillars' }, false,
    [{ date, total_score: 73 }], false, false, { physique: 10, habits: 20, social: 30, career: 40, total: 25 }];
  let index = 0;
  const { default: Page } = load('src/app/discipline/page.tsx', {
    react: { ...React, useState: () => [states[index++], () => {}], useEffect: () => {} },
    '@/components/finance/layout': { Shell: ({ children }) => children },
    '@/components/app-loading': { ContentSkeleton: () => null },
    '@/lib/i18n': { copy: { en: {} }, getLang: async () => 'en' },
    'lucide-react': Object.fromEntries(['Target', 'TrendingUp', 'HeartPulse', 'ListChecks', 'Users', 'Briefcase', 'RefreshCw'].map(name => [name, () => null])),
  });
  const html = renderToStaticMarkup(React.createElement(Page));
  assert.equal((html.match(/aria-label="[^"]*No recorded data"/g) ?? []).length, 28);
  assert.ok(html.includes(`aria-label="${date}: 73%"`));
  assert.ok(html.includes(': 25%"'));
  console.log('ActivityWatch authentication/owner isolation and truthful Discipline history: passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
