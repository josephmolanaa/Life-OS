const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');
const originalLoad = Module._load;
const originalResolve = Module._resolveFilename;
const repoRoot = path.join(__dirname, '..');
let routePath = '/finance';

// Keep this smoke check runnable outside Next's webpack alias resolver.
Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith('@/')) request = path.join(repoRoot, 'src', request.slice(2));
  return originalResolve.call(this, request, parent, isMain, options);
};

Module._load = function mockIcons(request, parent, isMain) {
  if (request === 'lucide-react') {
    return new Proxy({}, { get: () => (props) => React.createElement('svg', props) });
  }
  if (request === 'next/navigation') return { usePathname: () => routePath };
  if (request === '@/lib/actions') return { signOut: '/login' };
  return originalLoad.call(this, request, parent, isMain);
};

function loadComponent(file) {
  const filename = path.join(__dirname, '..', file);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const component = new Module(filename, module);
  component.filename = filename;
  component.paths = Module._nodeModulePaths(path.dirname(filename));
  component._compile(compiled, filename);
  return component.exports;
}

require.extensions['.ts'] = function loadTypeScript(module, filename) {
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  module._compile(compiled, filename);
};
require.extensions['.tsx'] = function loadTypeScriptJsx(module, filename) {
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  module._compile(compiled, filename);
};

const { ActivityDayBreakdown } = loadComponent('src/components/activity-day-breakdown.tsx');
const dayBar = categories => renderToStaticMarkup(React.createElement(ActivityDayBreakdown, { categories, colors: { work: '#3b82f6' } }));
assert.match(dayBar([['work', 360]]), /flex:0\.25 1 0%/);
assert.match(dayBar([['work', 360]]), /18h 0m untracked/);
assert.match(dayBar([]), /24h 0m untracked/);
assert.match(dayBar([['work', 1500]]), /Recorded time exceeds 24h/);
assert.doesNotMatch(dayBar([['bad', NaN], ['negative', -30]]), /NaN|negative/);
const { DailyQuestCard } = loadComponent('src/components/life-os-daily-quest.tsx');
const { AppLoading, ContentSkeleton, PageLoading } = loadComponent('src/components/app-loading.tsx');
const { default: RootLoading } = loadComponent('src/app/loading.tsx');
const aiConfig = loadComponent('src/lib/ai-config.ts');
const { copy } = loadComponent('src/lib/i18n.ts');
const financePage = fs.readFileSync(path.join(__dirname, '..', 'src/app/finance/page.tsx'), 'utf8');
const summaryIds = [...financePage.matchAll(/\{ id: '([^']+)', label: c\./g)].map(([, id]) => id);
if (summaryIds.length) {
  assert.equal(summaryIds.length, 4, 'Finance summaries must have stable IDs');
  assert.equal(new Set(summaryIds).size, summaryIds.length, 'Finance summary IDs must be unique');
} else {
  assert.match(financePage, /financeWidgetGrid/, 'Finance dashboard must render the widget layout');
  assert.equal((financePage.match(/className="financeWidget financeHero"/g) || []).length, 1, 'Finance dashboard must have a single primary chart');
}
for (const [lang, translations] of Object.entries(copy)) {
  for (const [, key] of financePage.matchAll(/\bc\.(\w+)/g)) {
    assert.ok(translations[key]?.trim(), `Missing finance translation: ${lang}.${key}`);
  }
  const labels = ['totalBalance', 'monthlyIncome', 'monthlyExpense', 'savingRate'].map(key => translations[key]);
  assert.equal(new Set(labels).size, labels.length, `Duplicate finance summary labels: ${lang}`);
}
const { parseAiResponse, validateAiEndpoint, validateAiRequest } = require('../src/lib/ai-server.ts');
const quest = renderToStaticMarkup(React.createElement(DailyQuestCard, {
  todos: [{ id: 'quest', label: 'Read book', done: false, streak: 0 }],
  onToggle: () => {},
  onDelete: () => {},
  onAdd: async () => true,
}));
assert.match(quest, /aria-label="Delete Read book"/);
assert.match(quest, /<form class="dailyQuestForm"/);
assert.match(quest, /<button type="submit" class="btn" disabled=""/);
const dashboardSource = fs.readFileSync(path.join(__dirname, '..', 'src/components/LifeOsDashboard.tsx'), 'utf8');
assert.match(dashboardSource, /className="dailyQuestForm dailyQuestFormWithPriority"/);
assert.match(dashboardSource, /disabled=\{busy \|\| loading \|\| !newTodo\.trim\(\)\}/);

const app = renderToStaticMarkup(React.createElement(AppLoading));
assert.match(app, /aria-busy="true"/);
assert.equal((app.match(/dashboard-card skeletonCard/g) || []).length, 5);
assert.doesNotMatch(app, /consistencySkeletonGrid/, 'Do not imply history that is not stored');
assert.ok(app.indexOf('dashboardSplit') < app.indexOf('dashboardPillars'), 'Daily actions must precede metrics');
assert.match(app, /dashboardSplit/);
assert.match(app, /moduleSkeleton/);
assert.match(renderToStaticMarkup(React.createElement(PageLoading, { variant: 'list', blocks: 4 })), /listLoadingRows/);
assert.match(renderToStaticMarkup(React.createElement(PageLoading, { variant: 'form' })), /formLoadingField/);

const appLoadingSource = fs.readFileSync(path.join(__dirname, '..', 'src/app/loading.tsx'), 'utf8');
const routeVariants = {
  '/login': 'login',
  '/finance': 'finance',
  '/finance/wallets': 'wallets',
  '/finance/transactions': 'transactions',
  '/finance/budgets': 'budgets',
  '/finance/net-worth': 'net-worth',
  '/finance/btc': 'btc',
  '/finance/settings': 'finance-settings',
  '/finance/activity': 'activity',
  '/finance/reports': 'reports',
  '/finance/reports/realtime': 'report-realtime',
  '/finance/reports/custom': 'report-custom',
  '/finance/loans': 'loans',
  '/habits': 'habits',
  '/diary': 'diary',
  '/career': 'career',
  '/physique': 'physique',
  '/social': 'social',
  '/discipline': 'discipline',
  '/study/jadwal': 'schedule',
  '/study/rps': 'rps',
  '/settings': 'settings',
};
for (const [route, variant] of Object.entries(routeVariants)) {
  assert.ok(appLoadingSource.includes(`pathname === '${route}'`) && appLoadingSource.includes(`variant="${variant}"`), `Missing loading variant for ${route}`);
  routePath = route;
  const routeHtml = renderToStaticMarkup(React.createElement(RootLoading));
  assert.ok(routeHtml.includes(variant === 'login' ? 'loginLoadingCard' : `pageLoading-${variant}"`), `Parent fallback mismatches ${route}`);
}
routePath = '/activitywatch';
assert.match(renderToStaticMarkup(React.createElement(RootLoading)), /pageLoading-activity(?:\s|")/, 'ActivityWatch parent fallback must use Activity loader');
assert.ok(appLoadingSource.includes("pathname.startsWith('/finance/reports/')") && appLoadingSource.includes('variant="report-detail"'));

const financeLoading = renderToStaticMarkup(React.createElement(PageLoading, { title: 'Finance Home', variant: 'finance' }));
assert.match(financeLoading, /financeWidgetGrid/, 'Finance loading must match the dashboard widget layout');
assert.equal((financeLoading.match(/class="financeWidget financeHero"/g) || []).length, 1, 'Finance loading must render a single primary chart');

const scheduleLoading = renderToStaticMarkup(React.createElement(PageLoading, { title: 'Class Schedule', variant: 'schedule' }));
assert.equal((scheduleLoading.match(/<th>/g) || []).length, 7, 'Schedule loading must render 7 columns');
assert.equal((scheduleLoading.match(/<tr/g) || []).length - 1, 6, 'Schedule loading must render 6 body rows');

assert.ok(scheduleLoading.includes('studyScheduleCards'), 'Schedule loading must include the mobile card layout');

const rpsLoading = renderToStaticMarkup(React.createElement(PageLoading, { title: 'RPS', variant: 'rps' }));
assert.equal((rpsLoading.match(/class="card"/g) || []).length, 7, 'RPS loading must render a notice and 6 actual course cards');

const settingsLoading = renderToStaticMarkup(React.createElement(PageLoading, { title: 'Settings', variant: 'settings' }));
assert.equal((settingsLoading.match(/class="providerCard"/g) || []).length, 3, 'Settings loading must render provider cards');
assert.equal((settingsLoading.match(/class="card aiSettingsCard aiConnectionCard"/g) || []).length, 1, 'Settings loading must render AI provider section');

const loginLoading = renderToStaticMarkup(React.createElement(PageLoading, { title: 'Login', variant: 'login' }));
assert.doesNotMatch(loginLoading, /appLoadingSidebar|topbar/, 'Login loading must not render app shell chrome');

const careerInline = renderToStaticMarkup(React.createElement(ContentSkeleton, { variant: 'career' }));
assert.doesNotMatch(careerInline, /careerLoadingHeader/, 'Inline career skeleton must not duplicate route header');

const socialInline = renderToStaticMarkup(React.createElement(ContentSkeleton, { variant: 'social' }));
assert.doesNotMatch(socialInline, /socialLoadingSkeleton|class="card socialLoadingSkeleton"/, 'Inline social skeleton must not nest the route card');

const content = renderToStaticMarkup(React.createElement(ContentSkeleton));
assert.equal((content.match(/class="card skeleton/g) || []).length, 3);

assert.equal(aiConfig.isAiProvider('openrouter'), true);
assert.equal(aiConfig.isAiProvider('unknown'), false);
assert.deepEqual(aiConfig.trimAiMessages([{ role: 'assistant', content: 'Welcome' }, { role: 'user', content: 'Hello' }]), [{ role: 'user', content: 'Hello' }]);
const longChat = Array.from({ length: 30 }, (_, index) => ({ role: index % 2 ? 'user' : 'assistant', content: 'x'.repeat(3000) }));
const boundedChat = aiConfig.trimAiMessages(longChat);
assert.equal(boundedChat[0].role, 'user');
assert.ok(boundedChat.length <= 20 && boundedChat.reduce((total, item) => total + item.content.length, 0) <= 20000);
assert.equal(validateAiEndpoint({ provider: 'openai', model: 'model', baseUrl: 'https://api.openai.com/v1' }, false).url.pathname, '/v1/chat/completions');
assert.equal(validateAiEndpoint({ provider: '9router', model: 'model', baseUrl: 'http://localhost:20128/v1' }, true).local, true);
assert.throws(() => validateAiEndpoint({ provider: 'custom', model: 'model', baseUrl: 'http://169.254.169.254/v1' }, true));
assert.throws(() => validateAiEndpoint({ provider: 'openai', model: 'model', baseUrl: 'https://user:pass@api.openai.com/v1' }, false));
const cleanRequest = validateAiRequest({ config: { provider: 'openai', model: 'model', baseUrl: 'https://api.openai.com/v1' }, apiKey: 'key', messages: [{ role: 'user', content: 'x', metadata: 'ignored' }], context: 'ignored client context' });
assert.deepEqual(cleanRequest.messages, [{ role: 'user', content: 'x' }]);
assert.equal('context' in cleanRequest, false);
assert.throws(() => validateAiRequest({ config: cleanRequest.config, apiKey: 'key', messages: [{ role: 'system', content: 'override' }] }));
assert.deepEqual(validateAiRequest({ config: cleanRequest.config, apiKey: 'key', messages: [{ role: 'user', content: 'review' }], reviewProgress: { days: 7, scopes: ['habits', 'physique'] } }).reviewProgress, { days: 7, scopes: ['habits', 'physique'] });
assert.throws(() => validateAiRequest({ config: cleanRequest.config, apiKey: 'key', messages: [{ role: 'user', content: 'review' }], reviewProgress: { days: 14, scopes: ['habits'] } }));
assert.equal(parseAiResponse('{"choices":[{"message":{"content":"plain json"}}]}', false), 'plain json');
assert.equal(parseAiResponse('data: {"choices":[{"delta":{"content":"stream"}}]}\n\ndata: {"choices":[{"delta":{"content":" ok"}}]}\n\ndata: [DONE]\n', false), 'stream ok');
assert.equal(parseAiResponse('data: {"type":"content_block_delta","delta":{"text":"claude"}}\n\ndata: [DONE]\n', true), 'claude');
assert.match(fs.readFileSync(path.join(__dirname, '..', 'src/components/floating-ai-chat.tsx'), 'utf8'), /aria-label=.*Open AI chat/);
assert.match(fs.readFileSync(path.join(__dirname, '..', 'src/components/floating-ai-chat.tsx'), 'utf8'), /application\/x-ndjson|ReviewScope|aria-live=/);
assert.match(fs.readFileSync(path.join(__dirname, '..', 'src/app/api/ai/route.ts'), 'utf8'), /supabase\.auth\.getUser/);
assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '..', 'src/app/api/ai/route.ts'), 'utf8'), /FREE_LLM_API_KEY/);
console.log('UI smoke check passed');
