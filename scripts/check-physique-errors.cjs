const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(require('node:path').join(__dirname, '../src/app/physique/page.tsx'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;

async function exerciseSave(ok) {
  const states = [];
  const calls = [];
  const jsx = (type, props) => ({ type, props });
  const context = { exports: {}, fetch: async (_url, options = {}) => {
    calls.push(options.method || 'GET');
    return options.method === 'POST'
      ? { ok, json: async () => ({ error: 'Database unavailable' }) }
      : { ok: true, json: async () => ({ weights: [], checklists: [] }) };
  }, require(name) {
    if (name === 'react') return {
      useEffect() {}, useRef: value => ({ current: value }),
      useState(initial) {
        const index = states.length;
        states.push(index === 0 ? false : index === 10 ? 'Lunch' : initial);
        return [states[index], value => { states[index] = value; }];
      },
    };
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === '@/lib/i18n') return { copy: { en: { weightAndTarget: 'Weight', mealSchedule: 'Meals' } } };
    return new Proxy({}, { get: (_target, key) => key });
  } };
  vm.runInNewContext(compiled, context);
  const tree = context.exports.default();
  function find(node, type) {
    if (!node || typeof node !== 'object') return;
    if (node.type === type) return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const result = find(child, type);
      if (result) return result;
    }
  }
  find(tree, 'form').props.onSubmit({ preventDefault() {} });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(states[2], false, 'Saving must finish after either outcome');
  assert.equal(states[10], ok ? '' : 'Lunch', 'Failed writes must retain the draft');
  assert.equal(states[1], ok ? '' : 'Database unavailable');
  assert.deepEqual(calls, ok ? ['POST', 'GET'] : ['POST']);
}

(async () => {
  await exerciseSave(false);
  await exerciseSave(true);
  console.log('Physique mutation success/failure checks passed (mock network).');
})().catch(error => { console.error(error); process.exitCode = 1; });
