const { spawnSync } = require('node:child_process');
const path = require('node:path');

const defaultSupabaseUrl = 'https://vvwmtfzatvwcedxqmxtk.supabase.co';
const defaultSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2d210ZnphdHZ3Y2VkeHFteHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1Njc2NzAsImV4cCI6MjA5NTE0MzY3MH0.KaBcN-VqOzoEUc5_HxgQ9U-qMhEAhBT0xeBJ9HxJWnM';

const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || defaultSupabaseUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || defaultSupabaseKey,
  TURBOPACK: '',
};
const cli = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');
const result = spawnSync(process.execPath, [cli, 'build'], { stdio: 'inherit', env });
process.exit(result.status ?? 1);
