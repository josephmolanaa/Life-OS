const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const context = { exports: {}, FormData, require: () => ({}) };
const compiled = ts.transpileModule(fs.readFileSync('src/lib/actions.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
vm.runInNewContext(compiled + '\nexports.check = { amount, dateValue, monthValue, enumValue };', context);
const { amount, dateValue, monthValue, enumValue } = context.exports.check;
const form = value => { const data = new FormData(); data.set('input', value); return data; };

for (const [raw, expected] of [['', 0], ['0', 0], ['100000', 100000], ['0.001', 0.001], ['1e-8', 0.00000001], ['1e3', 1000]]) {
  assert.equal(amount(form(raw), 'input'), expected);
}
for (const raw of ['-100', 'hello', 'Rp100', '1,234', '1.234.567', '1e999', '1e-999', '9007199254740992']) {
  assert.throws(() => amount(form(raw), 'input'), /valid non-negative amount/, raw);
}
assert.equal(dateValue(form('2024-02-29'), 'input'), '2024-02-29');
for (const raw of ['2026-02-29', '2026-02-30', '2026-13-01', 'today']) assert.throws(() => dateValue(form(raw), 'input'), /invalid/);
assert.equal(monthValue(form('2026-12'), 'input'), '2026-12-01');
assert.throws(() => monthValue(form('2026-13'), 'input'), /invalid/);
assert.equal(enumValue(form(''), 'input', ['cash', 'bank'], 'cash'), 'cash');
assert.throws(() => enumValue(form('unknown'), 'input', ['cash', 'bank'], 'cash'), /invalid/);
console.log('Finance input check passed: invalid values rejected, canonical amounts/BTC decimals preserved, calendar dates checked.');
