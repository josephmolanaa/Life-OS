const assert = require('node:assert/strict');
const { createRequire } = require('node:module');

const fromBuilder = createRequire(require.resolve('app-builder-lib/package.json'));
const fromGet = createRequire(fromBuilder.resolve('@electron/get/package.json'));
const proxy = fromGet('global-agent');
assert.equal(typeof proxy.bootstrap, 'function');
proxy.bootstrap();
assert.ok(global.GLOBAL_AGENT, 'Builder proxy bootstrap failed');
assert.equal(typeof fromBuilder('@electron/get').downloadArtifact, 'function');
console.log('PASS: Electron builder downloader and proxy bootstrap');
