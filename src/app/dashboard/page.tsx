import { createClient } from '@/lib/supabase/server'; 
import { requireFinance, totals } from '@/lib/data'; 
import { LifeOsDashboard } from '@/components/LifeOsDashboard'; 
import { Shell } from '@/components/finance/layout'; 
import { redirect } from 'next/navigation'; 
 
export default async function DashboardPage() { 
  const supabase = await createClient(); 
  const { data: { user } } = await supabase.auth.getUser(); 
  if (!user) redirect('/login'); 
 
  let financeSummary = { 
    totalBalance: 0, 
    income: 0, 
    expense: 0, 
    savingRate: 0 
  }; 
 
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
    console.log('Failed to load finance data for dashboard, rendering empty state.', err); 
  } 
 
  return ( 
    <Shell title="Dashboard" quickFab={false}>
      <LifeOsDashboard financeSummary={financeSummary} /> 
    </Shell> 
  ); 
  } 
