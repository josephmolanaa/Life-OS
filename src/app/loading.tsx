'use client';

import { usePathname } from 'next/navigation';
import { PageLoading } from '@/components/app-loading';

// Parent fallback can appear before a child segment's loading.tsx arrives.
export default function Loading() {
  const pathname = usePathname();
  if (pathname === '/login') return <PageLoading title="Login" variant="login" />;
  if (pathname === '/finance') return <PageLoading title="Finance Home" variant="finance" />;
  if (pathname === '/finance/wallets') return <PageLoading title="Wallets" variant="wallets" />;
  if (pathname === '/finance/transactions') return <PageLoading title="Transactions" variant="transactions" />;
  if (pathname === '/finance/budgets') return <PageLoading title="Budgets" variant="budgets" />;
  if (pathname === '/finance/net-worth') return <PageLoading title="Net Worth" variant="net-worth" />;
  if (pathname === '/finance/btc') return <PageLoading title="BTC DCA" variant="btc" />;
  if (pathname === '/finance/settings') return <PageLoading title="Finance Settings" variant="finance-settings" />;
  if (pathname === '/finance/activity' || pathname === '/activitywatch') return <PageLoading title="Activity" variant="activity" />;
  if (pathname === '/finance/reports') return <PageLoading title="Reports" variant="reports" />;
  if (pathname === '/finance/reports/realtime') return <PageLoading title="Reports" variant="report-realtime" />;
  if (pathname === '/finance/reports/custom') return <PageLoading title="Reports" variant="report-custom" />;
  if (pathname.startsWith('/finance/reports/')) return <PageLoading title="Report Details" variant="report-detail" />;
  if (pathname === '/finance/loans') return <PageLoading title="Loan / Give / Get" variant="loans" />;
  if (pathname === '/habits') return <PageLoading title="Habits" variant="habits" />;
  if (pathname === '/diary') return <PageLoading title="Personal Diary" variant="diary" />;
  if (pathname === '/career') return <PageLoading title="Career" variant="career" />;
  if (pathname === '/physique') return <PageLoading title="Physique Tracker" variant="physique" />;
  if (pathname === '/social') return <PageLoading title="Social Tracker" variant="social" />;
  if (pathname === '/discipline') return <PageLoading title="Discipline" variant="discipline" />;
  if (pathname === '/study/jadwal') return <PageLoading title="Class Schedule" variant="schedule" />;
  if (pathname === '/study/rps') return <PageLoading title="RPS (Rencana Pembelajaran Semester)" variant="rps" />;
  if (pathname === '/settings') return <PageLoading title="Settings" variant="settings" />;
  if (pathname === '/' || pathname === '/dashboard') return <PageLoading title="Dashboard" variant="home" />;
  return <div role="status" aria-busy="true" className="authLoading">Loading…</div>;
}
