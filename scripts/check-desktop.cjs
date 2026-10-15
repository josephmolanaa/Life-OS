const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const asar = require('@electron/asar');

const resources = path.join(__dirname, '..', 'dist', 'win-unpacked', 'resources');
const project = path.join(__dirname, '..');
const archive = path.join(resources, 'app.asar');
const files = new Set(asar.listPackage(archive).map((file) => file.replaceAll('\\', '/').replace(/^\//, '')));
assert.ok(files.has('electron/preload.cjs'), 'Missing secure-storage preload');
for (const file of ['electron/main.cjs', 'electron/preload.cjs']) {
  assert.equal(asar.extractFile(archive, file).toString(), fs.readFileSync(path.join(project, file), 'utf8'), `Stale packaged source: ${file}`);
}
const activityWatchOwner = asar.extractFile(archive, 'electron/main.cjs').toString();
assert.ok(activityWatchOwner.includes('activitywatch-owner.json'), 'Desktop server does not load ActivityWatch owner config');
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
const ownerConfigPath = path.join(resources, 'app-server', 'activitywatch-owner.json');
if (fs.existsSync(ownerConfigPath)) {
  const ownerConfig = JSON.parse(fs.readFileSync(ownerConfigPath, 'utf8'));
  assert.ok(Object.keys(ownerConfig).every((key) => key === 'id' || key === 'email'), 'ActivityWatch owner config contains unexpected data');
  assert.ok(!JSON.stringify(ownerConfig).includes('SUPABASE'), 'ActivityWatch owner config contains secrets');
}
const electron = require('electron');
const secureStorageCheck = path.join(__dirname, 'check-secure-storage.cjs');
const encrypted = spawnSync(electron, [secureStorageCheck, 'encrypt'], { encoding: 'utf8', windowsHide: true });
assert.equal(encrypted.status, 0, encrypted.stderr || 'Secure storage encryption failed');
const cipher = encrypted.stdout.trim().split(/\r?\n/).at(-1);
assert.ok(cipher && cipher !== 'life-os-secure-storage-check', 'Secure storage returned invalid ciphertext');
const decrypted = spawnSync(electron, [secureStorageCheck, 'decrypt', cipher], { encoding: 'utf8', windowsHide: true });
assert.equal(decrypted.status, 0, decrypted.stderr || 'Secure storage decryption after restart failed');
assert.equal(decrypted.stdout.trim().split(/\r?\n/).at(-1), 'life-os-secure-storage-check', 'Secure storage did not survive process restart');
console.log(`Desktop package OK: ${checked.size} updater dependencies, standalone server, encrypted key restart check and assets present.`);
