import assert from 'node:assert/strict';
import { countdownParts, formatCountdown, readDuckiesDisplay } from '../src/lib/duckies-display.ts';

const now = new Date('2026-10-31T22:00:00');
assert.deepEqual(countdownParts(new Date('2030-03-18T00:00:00'), now), { years: 3, months: 4, days: 14, hours: 2 });
assert.deepEqual(countdownParts(new Date('2026-11-01T01:30:00'), now), { years: 0, months: 0, days: 0, hours: 3 });
assert.equal(formatCountdown(new Date('2020-01-01'), now), '0y 0m 0d 0h');
assert.deepEqual(readDuckiesDisplay('{"mode":"clock","target":"2031-01-01T08:00"}'), { mode: 'clock', target: '2031-01-01T08:00' });
assert.deepEqual(readDuckiesDisplay('{"mode":"bad","target":"nope"}'), { mode: 'countdown', target: '2030-03-18T00:00' });
assert.deepEqual(readDuckiesDisplay('not json'), { mode: 'countdown', target: '2030-03-18T00:00' });
console.log('Duckies countdown OK');
