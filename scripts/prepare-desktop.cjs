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

// Always write bundled environment config for Next.js standalone runtime in production desktop
const desktopEnvPath = path.join(standalone, '.env.production');
const defaultSupabaseUrl = 'https://vvwmtfzatvwcedxqmxtk.supabase.co';
const defaultSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2d210ZnphdHZ3Y2VkeHFteHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1Njc2NzAsImV4cCI6MjA5NTE0MzY3MH0.KaBcN-VqOzoEUc5_HxgQ9U-qMhEAhBT0xeBJ9HxJWnM';

const envContent = [
  `NEXT_PUBLIC_SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL || defaultSupabaseUrl}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || defaultSupabaseKey}`,
  'LIFE_OS_LOCAL_AI=1',
  '',
].join('\n');
fs.writeFileSync(desktopEnvPath, envContent);

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
