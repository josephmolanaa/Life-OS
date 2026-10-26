import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Shell } from '@/components/finance/layout';
import { listActiveWallets, listTransactions, requireFinanceUser } from '@/lib/data';
import { copy, getLang } from '@/lib/i18n';
import { PrivacyAmount } from '@/components/finance/privacy-amount';

const number = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(month: string, lang: 'en' | 'id') {
  const [year, monthIndex] = month.split('-').map(Number);
  const first = new Date(year, monthIndex - 1, 1);
  const last = new Date(year, monthIndex, 0);
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  const formatter = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  return `${formatter.format(first)} - ${formatter.format(last)}`;
}

export default async function Reports() {
  const { user } = await requireFinanceUser();
  const lang = await getLang();
  const c = copy[lang];
  const [transactions, wallets] = await Promise.all([
    listTransactions(user.id),
    listActiveWallets(user.id),
  ]);
  const currentBalance = wallets.reduce((sum, wallet) => sum + Number(wallet.balance ?? wallet.initial_balance), 0);
  const months = transactions.reduce<Record<string, { income: number; expense: number }>>((acc, tx) => {
    const month = tx.transaction_date.slice(0, 7);
    acc[month] ??= { income: 0, expense: 0 };
    acc[month][tx.type] += Number(tx.amount);
    return acc;
  }, {});

  const rows = Object.entries(months).sort(([a], [b]) => b.localeCompare(a));
  if (!rows.some(([month]) => month === currentMonthValue())) rows.unshift([currentMonthValue(), { income: 0, expense: 0 }]);

  let rollingEndBalance = currentBalance;
  const monthRows = [];
  for (const [month, total] of rows) {
    const balance = total.income - total.expense;
    const endBalance = rollingEndBalance;
    const startBalance = endBalance - balance;
    rollingEndBalance = startBalance;
    monthRows.push({ month, ...total, balance, startBalance, endBalance });
  }

  return <Shell title={c.reportsTitle}>
    <div className="editPageNav"><Link className="btn ghost" href="/finance">{String.fromCodePoint(8592)} {lang === 'id' ? 'Kembali ke Finance' : 'Back to Finance'}</Link></div>
    <div className="reportTabs"><Link className="reportTab" href="/finance/reports/realtime">Realtime</Link><span className="reportTab active">Monthly</span></div>
    <div className="reportMonthList">
      {monthRows.map(row => <Link className="reportMonthBlock" key={row.month} href={`/finance/reports/${row.month}`}>
        <div className="reportMonthTitle">{monthRange(row.month, lang)}</div>
        <div className="reportLine"><span>Start Balance</span><b><PrivacyAmount value={number.format(row.startBalance)}/></b></div>
        <div className="reportLine"><span>{c.expense}</span><b><PrivacyAmount value={number.format(row.expense)}/> <ChevronRight size={16}/></b></div>
        <div className="reportLine"><span>{c.income}</span><b className="positive">+ <PrivacyAmount value={number.format(row.income)}/></b></div>
        <div className="reportLine"><span>Balance</span><b className={row.balance >= 0 ? 'positive' : 'negative'}>{row.balance >= 0 ? '+ ' : '- '}<PrivacyAmount value={number.format(Math.abs(row.balance))}/></b></div>
        <div className="reportLine"><span>End Balance</span><b><PrivacyAmount value={number.format(row.endBalance)}/></b></div>
      </Link>)}
      {monthRows.length === 0 && <div className="empty">{lang === 'id' ? 'Belum ada laporan bulanan' : 'No monthly reports yet'}</div>}
    </div>
  </Shell>;
}


