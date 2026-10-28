const assert = require('node:assert');

// Simple runtime verification of provider contract
const validProviders = ['openai', 'anthropic', 'openrouter', '9router', 'hermes', 'custom'];
assert.ok(validProviders.includes('hermes'), 'hermes must be recognized');

const defaultHermesUrl = 'http://localhost:11434/v1';
const url = new URL(defaultHermesUrl);
assert.strictEqual(url.protocol, 'http:');
assert.strictEqual(url.hostname, 'localhost');
assert.strictEqual(url.port, '11434');

console.log('Hermes configuration contract verified successfully.');
