const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const targetDir = 'D:\\Scaramouche Installation\\Life OS\\resources\\app-server';
const exePath = 'D:\\Scaramouche Installation\\Life OS\\Life OS.exe';

console.log('1. Killing Life OS.exe...');
try {
  execSync('taskkill /F /IM "Life OS.exe"', { stdio: 'ignore' });
  console.log('   Killed Life OS.exe');
} catch {
  console.log('   Life OS.exe was not running or could not be killed');
}

// Wait 1 second for file handles to release
execSync('powershell -Command "Start-Sleep -Seconds 1"');

console.log('2. Syncing standalone build to installed desktop...');
fs.cpSync(path.join(__dirname, '..', '.next', 'standalone'), targetDir, { recursive: true, force: true });
console.log('   Standalone synced.');

console.log('3. Syncing static assets...');
const targetStatic = path.join(targetDir, '.next', 'static');
fs.mkdirSync(targetStatic, { recursive: true });
fs.cpSync(path.join(__dirname, '..', '.next', 'static'), targetStatic, { recursive: true, force: true });
console.log('   Static assets synced.');

console.log('4. Syncing public assets...');
const targetPublic = path.join(targetDir, 'public');
fs.mkdirSync(targetPublic, { recursive: true });
fs.cpSync(path.join(__dirname, '..', 'public'), targetPublic, { recursive: true, force: true });
console.log('   Public assets synced.');

console.log('5. Launching Life OS.exe...');
const child = spawn(exePath, [], {
  detached: true,
  stdio: 'ignore'
});
child.unref();

console.log('✓ Successfully deployed and launched Life OS desktop!');
