const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const asar = require('@electron/asar');

const resources = path.join(__dirname, '..', 'dist', 'win-unpacked', 'resources');
const project = path.join(__dirname, '..');
const archive = path.join(resources, 'app.asar');
const files = new Set(asar.listPackage(archive).map((file) => file.replaceAll('\\', '/').replace(/^\//, '')));
const checked = new Set();

function checkDependencies(directory) {
  if (checked.has(directory)) return;
  checked.add(directory);
  const manifest = JSON.parse(fs.readFileSync(path.join(project, directory, 'package.json')));

  for (const dependency of Object.keys(manifest.dependencies || {})) {
    let parent = directory;
    let resolved;
    while (true) {
      const candidate = path.posix.join(parent, 'node_modules', dependency);
      if (files.has(`${candidate}/package.json`)) {
        resolved = candidate;
        break;
      }
      if (parent === '.') break;
      parent = path.posix.dirname(parent);
    }
    assert.ok(resolved, `${manifest.name}: missing packaged dependency ${dependency}`);
    checkDependencies(resolved);
  }
}

checkDependencies('node_modules/electron-updater');
for (const file of ['server.js', '.next/BUILD_ID', '.next/static', 'public/icon.svg', 'node_modules/next/dist/server/lib/start-server.js']) {
  assert.ok(fs.existsSync(path.join(resources, 'app-server', file)), `Missing standalone resource: ${file}`);
}
assert.ok(!fs.existsSync(path.join(resources, 'app-server', '.env.local')), 'Do not distribute .env.local');
console.log(`Desktop package OK: ${checked.size} updater dependencies, standalone server and assets present.`);
