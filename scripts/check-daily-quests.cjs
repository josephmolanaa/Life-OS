const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function harness(file, mocks = {}) {
  const state = [], refs = [], effects = []; let cursor = 0, refCursor = 0;
  const react = { useState(initial) { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }]; }, useRef(initial) { const index = refCursor++; return refs[index] ??= { current: initial }; }, useEffect(effect) { effects.push(effect); } };
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: name => name === 'react' ? react : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : new Proxy({}, { get: () => 'svg' }), ...mocks });
  return { exports, effects, render(fn, ...args) { cursor = 0; refCursor = 0; effects.length = 0; return fn(...args); } };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const initial = { id: 'habit', label: 'Read', done: false };
const requests = []; let resolveRequest;
const hook = harness('src/components/use-daily-quests.ts', { fetch: (url, options) => {
  if (!options.method) return Promise.resolve({ ok: true, json: async () => [initial] });
  requests.push({ url, options }); return new Promise(resolve => { resolveRequest = resolve; });
}, window: { confirm: () => true } });
const render = () => hook.render(hook.exports.useDailyQuests, 'en');
function nodes(node) { if (!node || typeof node !== 'object') return []; return [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)]; }
(async () => {
  render(); hook.effects[0](); await flush();
  let view = render(); assert.equal(view.loading, false);
  const pending = view.onToggle('habit', true);
  assert.equal(render().todos[0].done, false, 'Visible state must wait for response');
  assert.equal(render().busy, true);
  assert.equal(await view.onToggle('habit', true), false, 'Synchronous lock rejects duplicate before re-render');
  assert.equal(requests.length, 1);
  resolveRequest({ ok: false }); assert.equal(await pending, false);
  view = render(); assert.equal(view.todos[0].done, false); assert.ok(view.error); assert.equal(view.busy, false);
  const success = view.onToggle('habit', true);
  assert.equal(render().todos[0].done, false);
  resolveRequest({ ok: true, json: async () => ({ ...initial, done: true }) });
  assert.equal(await success, true); assert.equal(render().todos[0].done, true);
  const card = harness('src/components/life-os-daily-quest.tsx');
  const props = { todos: [initial], onToggle: async () => false, onUpdate: async () => false, onAdd: async () => false };
  const cardView = () => nodes(card.render(card.exports.DailyQuestCard, props));
  let elements = cardView(); elements.find(n => n.type === 'button' && n.props['aria-label'] === 'Edit Read').props.onClick();
  elements = cardView(); elements.find(n => n.type === 'input' && n.props['aria-label'] === 'Edit Read').props.onChange({ target: { value: 'Revised text' } });
  elements = cardView(); elements.find(n => n.type === 'button' && n.props['aria-label'] === 'Save Read').props.onClick(); await flush();
  elements = cardView(); assert.equal(elements.find(n => n.type === 'input' && n.props['aria-label'] === 'Edit Read').props.value, 'Revised text', 'Failed edit must retain draft and editor');
  elements.find(n => n.props?.className === 'input dailyQuestInput').props.onChange({ target: { value: 'Keep new habit' } });
  elements = cardView(); await elements.find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(cardView().find(n => n.props?.className === 'input dailyQuestInput').props.value, 'Keep new habit');
  console.log('Daily quests: failed PUT unchanged, pending lock, confirmed updates, edit/add failure drafts retained.');
})().catch(error => { console.error(error); process.exitCode = 1; });
