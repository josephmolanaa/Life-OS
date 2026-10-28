import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const tables = ['wallets', 'categories', 'transactions', 'transfers', 'loans', 'budgets', 'btc_dca_logs', 'net_worth_snapshots'] as const;

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvSection(name: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return `# ${name}\n`;
  const headers = Object.keys(rows[0]);
  return [`# ${name}`, headers.map(csvEscape).join(','), ...rows.map(row => headers.map(header => csvEscape(row[header])).join(','))].join('\n');
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const sections = await Promise.all(tables.map(async table => {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', user.id);
    if (error) return csvSection(table, [{ error: error.message }]);
    return csvSection(table, data ?? []);
  }));

  const body = sections.join('\n\n');
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="finance-backup-${stamp}.csv"`,
    },
  });
}
