import Link from 'next/link';
import { ChevronRight, Download } from 'lucide-react';
import { ExpensePie } from '@/components/finance/charts';
import { Shell } from '@/components/finance/layout';
import { requireFinance, totals } from '@/lib/data';
import { copy, getLang } from '@/lib/i18n';
import { PrivacyAmount } from '@/components/finance/privacy-amount';

const number = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const colors = ['#a9442e', '#c08635', '#4662a3', '#7c2a85', '#3f8aa3', '#a34b68', '#5f8532', '#963737'];

function monthRange(month: string, lang: 'en' | 'id') {
  const [year, monthIndex] = month.split('-').map(Number);
  const first = new Date(year, monthIndex - 1, 1);
  const last = new Date(year, monthIndex, 0);
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  const formatter = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  return `${formatter.format(first)} - ${formatter.format(last)}`;
}

function daysInMonth(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  return new Date(year, monthIndex, 0).getDate();
}

function groupItems(transactions: Awaited<ReturnType<typeof requireFinance>>['transactions'], type: 'expense' | 'income', mode: 'category' | 'title') {
  return Object.values(transactions.filter(tx => tx.type === type).reduce<Record<string, { name: string; value: number; color: string }>>((acc, tx) => {
    const name = mode === 'category' ? tx.categories?.name ?? 'Other' : tx.note || tx.categories?.name || 'Untitled';
    acc[name] ??= { name, value: 0, color: tx.categories?.color ?? colors[Object.keys(acc).length % colors.length] };
    acc[name].value += Number(tx.amount);
    return acc;
  }, {})).sort((a, b) => b.value - a.value).map((item, index) => ({ ...item, color: colors[index % colors.length] }));
}

function ProgressList({ title, items, total }: { title: string; items: { name: string; value: number; color: string }[]; total: number }) {
  return <div className="reportDetailSection">
    <h3>{title}</h3>
    {items.map(item => {
      const percent = total > 0 ? Math.round(item.value / total * 100) : 0;
      return <div className="reportProgressItem" key={item.name}>
        <div className="reportProgressHead"><span>{item.name}</span><b><PrivacyAmount value={number.format(item.value)}/> <ChevronRight size={16}/></b></div>
        <div className="reportBar"><i style={{width:`${percent}%`, background:item.color}}/></div>
      </div>;
    })}
  </div>;
}

export default async function ReportMonthDetail({ params, searchParams }: { params: Promise<{ month: string }>; searchParams: Promise<{ view?: string }> }) {
  const { month } = await params;
  const query = await searchParams;
  const view = query.view === 'category' || query.view === 'title' ? query.view : 'chart';
  const data = await requireFinance(month);
  const lang = await getLang();
  const c = copy[lang];
  const t = totals(data);
  const dayCount = daysInMonth(month);
  const expenseCategories = groupItems(data.transactions, 'expense', 'category');
  const incomeCategories = groupItems(data.transactions, 'income', 'category');
  const expenseTitles = groupItems(data.transactions, 'expense', 'title');
  const incomeTitles = groupItems(data.transactions, 'income', 'title');

  const summary = <>
    <div className="reportLine"><span>{c.expense}</span><b><PrivacyAmount value={number.format(t.expense)}/></b></div>
    <div className="reportLine sub"><span>daily average</span><b><PrivacyAmount value={number.format(t.expense / dayCount)}/></b></div>
    <div className="reportLine"><span>{c.income}</span><b className="positive">+ <PrivacyAmount value={number.format(t.income)}/></b></div>
    <div className="reportLine sub"><span>daily average</span><b className="positive">+ <PrivacyAmount value={number.format(t.income / dayCount)}/></b></div>
    <div className="reportLine"><span>Balance</span><b className={t.cashflow >= 0 ? 'positive' : 'negative'}>{t.cashflow >= 0 ? '+ ' : '- '}<PrivacyAmount value={number.format(Math.abs(t.cashflow))}/></b></div>
  </>;

  return <Shell title="Report Details" quickFab={false}>
    <div className="reportDetailTop"><Link href="/finance/reports">{String.fromCodePoint(8249)}</Link><b>Report Details</b><Download size={24}/></div>
    <div className="reportDetailTabs">
      <Link className={view === 'chart' ? 'active' : ''} href={`/finance/reports/${month}?view=chart`}>Chart</Link>
      <Link className={view === 'category' ? 'active' : ''} href={`/finance/reports/${month}?view=category`}>Category</Link>
      <Link className={view === 'title' ? 'active' : ''} href={`/finance/reports/${month}?view=title`}>Title</Link>
    </div>
    <div className="reportDetailBody">
      <div className="reportMonthTitle">{monthRange(month, lang)}</div>
      {view === 'chart' && <>
        <ExpensePie data={expenseCategories}/>
        <div className="reportLegend">
          {expenseCategories.map((item) => {
            const percent = t.expense > 0 ? Math.round(item.value / t.expense * 100) : 0;
            return <div className="reportLegendRow" key={item.name}><span style={{background:item.color}}>{percent} %</span><b>{item.name}</b><strong><PrivacyAmount value={number.format(item.value)}/></strong></div>;
          })}
        </div>
      </>}
      {view === 'category' && <>{summary}<ProgressList title="Expenses by Category" items={expenseCategories} total={t.expense}/><ProgressList title="Incomes by Category" items={incomeCategories} total={t.income}/></>}
      {view === 'title' && <>{summary}<ProgressList title="Expenses by Title" items={expenseTitles} total={t.expense}/><ProgressList title="Incomes by Title" items={incomeTitles} total={t.income}/></>}
    </div>
  </Shell>;
}
