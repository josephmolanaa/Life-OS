const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, requireMock, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: requireMock, ...globals });
  return exports;
}
const storage = new Map();
const sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
const draft = load('src/lib/diary-draft.ts', require, { sessionStorage, Date });
const content = { date: '2026-10-22', text: 'private draft', mood: 'Okay', expectedUpdated: null };
draft.writeDiaryDraft('alice', content);
assert.equal(draft.readDiaryDraft('alice').text, content.text);
assert.equal(draft.readDiaryDraft('bob'), null);
// A new route/module instance recovers the same tab draft.
assert.equal(load('src/lib/diary-draft.ts', require, { sessionStorage, Date }).readDiaryDraft('alice').text, content.text);
draft.writeDiaryDraft('alice', null);
assert.equal(draft.readDiaryDraft('alice'), null);
storage.set('life-os-diary-draft:alice', '{broken');
assert.equal(draft.readDiaryDraft('alice'), null);
storage.set('life-os-diary-draft:alice', JSON.stringify({ ...content, savedAt: Date.now() - 86400001 }));
assert.equal(draft.readDiaryDraft('alice'), null);
const themeSource = fs.readFileSync('src/app/layout.tsx', 'utf8').match(/const themeScript = `([\s\S]*?)`;/)[1];
for (const [saved, system, expected] of [['light', true, false], ['dark', false, true], [null, true, true], [null, false, false]]) {
 const classes = new Set(['dark-mode']);
 vm.runInNewContext(themeSource, { localStorage: { getItem: key => key === 'finance-theme' ? saved : null }, window: { matchMedia: () => ({ matches: system }) }, document: { documentElement: { classList: { toggle: (name, value) => value ? classes.add(name) : classes.delete(name), add: name => classes.add(name) } } } });
 assert.equal(classes.has('dark-mode'), expected);
}
let states = [], cursor = 0, effects = [];
const react = { useState(initial) { const index = cursor++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; }, useEffect(effect) { effects.push(effect); } };
const jsx = (type, props) => ({ type, props });
const user = { email: 'old@example.com', user_metadata: { display_name: 'Original', avatar_url: '' } };
const client = { auth: { getUser: async () => ({ data: { user } }), updateUser: async () => { throw new Error('offline'); } } };
const Account = load('src/app/account/page.tsx', name => name === 'react' ? react : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : name === '@/lib/supabase/client' ? { createClient: () => client } : {}, { document: { cookie: '' }, window: { location: { replace() {} } }, URL }).default;
function render() { cursor = 0; effects = []; return Account(); }
function all(node) { if (!node || typeof node !== 'object') return []; return [node, ...[node.props?.children].flat(Infinity).flatMap(all)]; }
(async () => {
 render(); effects[0](); await new Promise(resolve => setImmediate(resolve));
 let nodes = all(render());
 nodes.find(n => n.props?.id === 'displayName').props.onChange({ target: { value: 'Changed' } });
 nodes = all(render()); nodes.find(n => n.type === 'button' && n.props.className === 'btn-secondary').props.onClick();
 nodes = all(render()); assert.equal(nodes.find(n => n.props?.id === 'displayName').props.value, 'Original');
 nodes.find(n => n.props?.id === 'displayName').props.onChange({ target: { value: 'Keep me' } });
 nodes = all(render()); await nodes.find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
 nodes = all(render()); assert.equal(nodes.find(n => n.props?.id === 'displayName').props.value, 'Keep me');
 assert.equal(nodes.find(n => n.type === 'button' && n.props.type === 'submit').props.disabled, false);
 assert.ok(nodes.some(n => n.props?.role === 'alert'));
 console.log('Draft isolation/recovery/expiry, theme restore, account Cancel and failed-save retention passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
