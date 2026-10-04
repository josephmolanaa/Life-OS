const fs = require('node:fs');
const path = require('node:path');

const standalone = path.join(__dirname, '..', '.next', 'standalone');
const publicDir = path.join(__dirname, '..', 'public');
const staticDir = path.join(__dirname, '..', '.next', 'static');

if (!fs.existsSync(standalone)) {
  throw new Error('Missing .next/standalone. Run the Next.js build first.');
}

fs.cpSync(publicDir, path.join(standalone, 'public'), { recursive: true });
fs.cpSync(staticDir, path.join(standalone, '.next', 'static'), { recursive: true });
console.log('Prepared Next.js standalone assets for Electron');
