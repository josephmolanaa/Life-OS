const { spawnSync } = require('node:child_process');
const path = require('node:path');

const env = { ...process.env, TURBOPACK: '' };
const cli = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');
const result = spawnSync(process.execPath, [cli, 'build'], { stdio: 'inherit', env });
process.exit(result.status ?? 1);
