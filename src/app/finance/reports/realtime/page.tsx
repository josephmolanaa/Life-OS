import Link from 'next/link';
import { Shell } from '@/components/finance/layout';
import { PrivacyAmount } from '@/components/finance/privacy-amount';
import { requireFinanceUser, listTransactions, listActiveWallets } from '@/lib/data';
import { copy, getLang } from '@/lib/i18n';

const number = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function todayValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default async function RealtimeReportPage() {
  const { user } = await requireFinanceUser();
  const lang = await getLang();
  const c = copy[lang];
  const [transactions, wallets] = await Promise.all([listTransactions(user.id), listActiveWallets(user.id)]);
  const currentBalance = wallets.reduce((sum, wallet) => sum + Number(wallet.balance ?? wallet.initial_balance), 0);
  const today = todayValue();
  const todayTransactions = transactions.filter(tx => tx.transaction_date.slice(0, 10) === today);
  const todayIncome = todayTransactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const todayExpense = todayTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const todayCashflow = todayIncome - todayExpense;

  return <Shell title={c.reportsTitle} quickFab={false}>
    <div className="reportTabs">
      <span className="reportTab active">Realtime</span>
      <Link className="reportTab" href="/finance/reports">Monthly</Link>
      <Link className="reportTab" href="/finance/reports/custom">Custom</Link>
    </div>
    <div className="card reportPanel">
      <div className="reportMonthTitle">Today</div>
      <div className="reportLine"><span>Total Balance</span><b><PrivacyAmount value={number.format(currentBalance)} /></b></div>
      <div className="reportLine"><span>{c.income}</span><b className="positive">+ <PrivacyAmount value={number.format(todayIncome)} /></b></div>
      <div className="reportLine"><span>{c.expense}</span><b className="negative">- <PrivacyAmount value={number.format(todayExpense)} /></b></div>
      <div className="reportLine"><span>Cashflow</span><b className={todayCashflow >= 0 ? 'positive' : 'negative'}>{todayCashflow >= 0 ? '+ ' : '- '}<PrivacyAmount value={number.format(Math.abs(todayCashflow))} /></b></div>
      <div className="muted sectionGap">Updated from transactions on {today}</div>
    </div>
    <div className="card reportPanel">
      <div className="reportMonthTitle">Latest Activity</div>
      {todayTransactions.length === 0 ? <div className="empty">No transaction today</div> : todayTransactions.slice(0, 10).map(tx => <div className="reportLine" key={tx.id}><span>{tx.note || tx.categories?.name || 'Untitled'}</span><b className={tx.type === 'income' ? 'positive' : 'negative'}>{tx.type === 'income' ? '+ ' : '- '}<PrivacyAmount value={number.format(Number(tx.amount))} /></b></div>)}
    </div>
  </Shell>;
}
