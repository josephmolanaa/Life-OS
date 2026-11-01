const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  // Use RPC to execute raw SQL since we can't run DDL directly through the client
  // We'll use the SQL Editor approach - just print the SQL for manual execution
  const sql = `
-- Migration 014: Add start_time and end_time to todos
BEGIN;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS start_time time;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS end_time time;
CREATE INDEX IF NOT EXISTS todos_task_time_range_idx ON public.todos (user_id, start_time, end_time) WHERE list_kind = 'task';
COMMIT;
`;

  console.log('=== RUN THIS SQL IN SUPABASE SQL EDITOR ===');
  console.log(sql);
  console.log('===========================================');
  console.log('\nOr run via Supabase Dashboard -> SQL Editor -> New Query -> Paste above -> Run');
}

applyMigration();