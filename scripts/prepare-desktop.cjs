const fs = require('node:fs');
const path = require('node:path');

const standalone = path.join(__dirname, '..', '.next', 'standalone');
const publicDir = path.join(__dirname, '..', 'public');
const staticDir = path.join(__dirname, '..', '.next', 'static');
const projectRoot = path.join(__dirname, '..');
const ownerConfigPath = path.join(standalone, 'activitywatch-owner.json');

if (!fs.existsSync(standalone)) {
  throw new Error('Missing .next/standalone. Run the Next.js build first.');
}

fs.cpSync(publicDir, path.join(standalone, 'public'), { recursive: true });
fs.cpSync(staticDir, path.join(standalone, '.next', 'static'), { recursive: true });

// Owner identity is not a secret. Package only these two allow-list values;
// never copy the complete .env.local into the installer.
const envPath = path.join(projectRoot, '.env.local');
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const readEnv = (name) => env.match(new RegExp(`^${name}\\s*=\\s*["']?([^"'\\r\\n]+)`, 'm'))?.[1]?.trim();
const owner = {
  id: readEnv('ACTIVITYWATCH_OWNER_ID'),
  email: readEnv('ACTIVITYWATCH_OWNER_EMAIL')?.toLowerCase(),
};
if (owner.id || owner.email) fs.writeFileSync(ownerConfigPath, `${JSON.stringify(owner)}\n`);
else fs.rmSync(ownerConfigPath, { force: true });
console.log('Prepared Next.js standalone assets for Electron');
