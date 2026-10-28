const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/task-view.ts'), 'utf8');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const { filterTasks } = context.exports;
const tasks = [
  { label: 'Read book', done: false, priority: 'LOW' },
  { label: 'Ship work', done: false, priority: 'HIGH' },
  { label: 'Finished work', done: true, priority: 'HIGH' },
];
const labels = rows => Array.from(rows, row => row.label);
assert.deepEqual(labels(filterTasks(tasks, 'active', '')), ['Ship work', 'Read book']);
assert.deepEqual(labels(filterTasks(tasks, 'completed', '')), ['Finished work']);
assert.deepEqual(labels(filterTasks(tasks, 'all', ' WORK ')), ['Ship work', 'Finished work']);
assert.equal(filterTasks(tasks, 'active', 'missing').length, 0);
assert.equal(tasks[0].label, 'Read book');
console.log('Task views OK: status, search, priority, empty results, input preserved.');
