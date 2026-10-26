import { createClient } from '@/lib/supabase/server';
import { requireFinance, totals } from '@/lib/data';
import { LifeOsDashboard } from '@/components/LifeOsDashboard';
import { Shell } from '@/components/finance/layout';
import { redirect } from 'next/navigation';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let financeSummary: { totalBalance: number; income: number; expense: number; savingRate: number } | null = null;
  const consistencyHistory: Record<string, number> = {};
  // Keep a small buffer for local-time boundaries; the client renders the exact 53×7 cells.
  // eslint-disable-next-line react-hooks/purity
  const { data: contributions } = await supabase.from('contributions').select('date,count').eq('user_id', user.id).gte('date', new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10));
  for (const row of contributions || []) consistencyHistory[String(row.date)] = Number(row.count) || 0;

  try {
    const data = await requireFinance();
    const t = totals(data);
    financeSummary = {
      totalBalance: t.totalBalance,
      income: t.income,
      expense: t.expense,
      savingRate: t.savingRate
    };
  } catch (err) {
    console.error('Failed to load finance data for home.', err);
  }

  // Wrap the dashboard inside the unified Shell layout (which shows the Sidebar)
  return (
    <Shell title="Dashboard" quickFab={false}>
      <LifeOsDashboard financeSummary={financeSummary} consistencyHistory={consistencyHistory} />
    </Shell>
  );
}
