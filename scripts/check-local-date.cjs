const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/components/finance/local-date-input.tsx'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText;
let effect;
const context = {
  exports: {},
  Date: class extends Date {
    constructor() { super('2026-10-11T21:30:00Z'); }
  },
  require(name) {
    if (name === 'react') return { useRef: () => ({ current: null }), useEffect: fn => { effect = fn; } };
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) };
    throw new Error(`Unexpected import: ${name}`);
  },
};
vm.runInNewContext(compiled, context);
const originalTimezone = process.env.TZ;
try {
  for (const [timezone, expected] of [['Asia/Bangkok', '2026-10-12'], ['America/Los_Angeles', '2026-10-11'], ['UTC', '2026-10-11']]) {
    process.env.TZ = timezone;
    const input = context.exports.LocalDateInput({ name: 'date' });
    assert.equal(input.props.type, 'date');
    assert.equal(input.props.defaultValue, undefined, 'SSR must not prefill a server-timezone date');
    input.props.ref.current = { value: '' };
    effect();
    assert.equal(input.props.ref.current.value, expected, timezone);
    input.props.ref.current.value = '2025-02-28';
    effect();
    assert.equal(input.props.ref.current.value, '2025-02-28', 'Keep a selected/restored date');
  }
} finally {
  if (originalTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = originalTimezone;
}
console.log('Local date check passed: UTC, UTC+7, UTC-7, hydration and selected date preservation.');
