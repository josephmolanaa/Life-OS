const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
(async () => {
  const deleted = [];
  const handlers = {};
  let retired = false;
  const cacheMock = { keys: async () => ['life-os-shell-v1', 'another-app-v1'], delete: async key => { deleted.push(key); return true; } };
  vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), { caches: cacheMock, self: {
    addEventListener: (name, fn) => { handlers[name] = fn; }, skipWaiting() {},
    registration: { unregister: async () => { retired = true; } },
  } });
  let activation;
  handlers.activate({ waitUntil: promise => { activation = promise; } });
  await activation;
  assert.deepEqual(deleted, ['life-os-shell-v1']);
  assert.equal(retired, true);
  assert.equal(handlers.fetch, undefined, 'No HTML fallback for API or asset requests');
  const unregistered = [];
  const registrations = ['https://life.test/sw.js', 'https://life.test/another/sw.js'].map(scriptURL => ({ active: { scriptURL }, unregister: async () => unregistered.push(scriptURL) }));
  const effects = [];
  const compiled = ts.transpileModule(fs.readFileSync('src/components/pwa-register.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const output = { exports: {} };
  vm.runInNewContext(compiled, { exports: output.exports, require: name => name === 'react' ? { useEffect: fn => effects.push(fn), useSyncExternalStore: () => true } : { jsx() {} }, navigator: { serviceWorker: { getRegistrations: async () => registrations } }, window: { location: { origin: 'https://life.test' } }, URL });
  assert.equal(output.exports.PwaRegister(), null);
  effects.forEach(fn => fn());
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(unregistered, ['https://life.test/sw.js']);
  console.log('PWA retirement and unrelated app isolation: passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
