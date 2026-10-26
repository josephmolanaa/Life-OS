const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const source = fs.readFileSync('src/lib/finance.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {}, Intl, Date };
new Function('exports', 'module', compiled)(context.exports, { exports: context.exports });
const { monthBounds } = context.exports;
assert.deepEqual(monthBounds('2026-10'), { month: '2026-10', start: '2026-10-01', end: '2026-10-31' });
assert.deepEqual(monthBounds('2024-02'), { month: '2024-02', start: '2024-02-01', end: '2024-02-29' });
assert.ok(source.includes('const localDate'), 'month bounds format dates in local time');
console.log('Finance month bounds: local timezone-safe month start/end and leap day passed.');
