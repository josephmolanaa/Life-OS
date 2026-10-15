const assert = require('node:assert/strict');
const fs = require('node:fs');
const { parseLocalTodos, todoStorageKey } = require('../src/lib/local-todos.ts');

assert.notEqual(todoStorageKey('user-a'), todoStorageKey('user-b'));
assert.deepEqual(parseLocalTodos(JSON.stringify([{ id: 'a', label: 'A', done: false }])), [{ id: 'a', label: 'A', done: false }]);
assert.deepEqual(parseLocalTodos(null), []);
const legacy = JSON.stringify([{ id: 'legacy', label: 'Old', done: true }]);
const userA = new Map([[todoStorageKey('user-a'), legacy]]);
assert.equal(userA.get('editable-todos'), undefined, 'legacy key is never overwritten');
const source = new Map([['editable-todos', legacy]]);
const parsed = parseLocalTodos(source.get('editable-todos'));
parsed[0].done = false;
assert.equal(source.get('editable-todos'), legacy, 'Parsing legacy imports must not mutate the original backup.');
const dashboard = fs.readFileSync(require.resolve('../src/components/LifeOsDashboard.tsx'), 'utf8');
assert.match(dashboard, /importLegacy\('editable-todos'\)/, 'Unscoped legacy import must remain an explicit action.');
assert.doesNotMatch(dashboard, /localStorage\.(removeItem|clear)\(/, 'Import must preserve all original local backups.');
console.log('Local todo account isolation checks passed.');
