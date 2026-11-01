const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function runMigration() {
  // Use Supabase's raw query via PostgREST - execute each statement
  const statements = [
    'ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS start_time time;',
    'ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS end_time time;',
    'CREATE INDEX IF NOT EXISTS todos_task_time_range_idx ON public.todos (user_id, start_time, end_time) WHERE list_kind = \'task\';'
  ];

  for (const sql of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        // Try alternative: use the pg_catalog.pg_sleep workaround or direct REST
        console.log(`Trying direct REST for: ${sql}`);
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
            'Prefer': 'return=minimal',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ query: sql })
        });
        if (!response.ok) {
          const err = await response.text();
          console.error('Failed:', sql, err);
        } else {
          console.log('OK:', sql);
        }
      } else {
        console.log('OK via rpc:', sql);
      }
    } catch (err) {
      console.error('Error executing:', sql, err.message);
    }
  }
  console.log('Migration 014 completed!');
}

runMigration();