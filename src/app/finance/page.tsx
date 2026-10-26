import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Plus, Wallet } from 'lucide-react';
import { Shell } from '@/components/finance/layout';
import { ExpensePie, TrendLine } from '@/components/finance/charts';
import { PrivacyAmount } from '@/components/finance/privacy-amount';
import { PrivacyToggleButton } from '@/components/finance/privacy-toggle-button';
import { requireFinance } from '@/lib/data';
import { formatMoney, monthBounds, pct, shiftFinanceMonth, validFinanceMonth } from '@/lib/finance';
import { copy, getLang } from '@/lib/i18n';

export default async function FinanceHome({ searchParams }: { searchParams?: Promise<{ month?: string | string[]; currency?: string | string[] }> }) {
  const [lang, params] = await Promise.all([getLang(), searchParams]);
  const c = copy[lang];
  const id = lang === 'id';
  const month = monthBounds(validFinanceMonth(params?.month));
  const data = await requireFinance(month.month);
  const locale = id ? 'id-ID' : 'en-US';
  const periodLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(`${month.month}-01T12:00:00`));
  const activeWallets = data.wallets.filter(wallet => !wallet.is_archived);
  const walletCurrency = (walletId: string) => data.wallets.find(wallet => wallet.id === walletId)?.currency ?? 'IDR';
  const currencies = [...new Set([...data.wallets.map(wallet => wallet.currency), ...data.transactions.map(tx => tx.wallets?.currency ?? walletCurrency(tx.wallet_id))])].sort();
  if (!currencies.length) currencies.push('IDR');
  const currency = typeof params?.currency === 'string' && currencies.includes(params.currency) ? params.currency : currencies.includes('IDR') ? 'IDR' : currencies[0];
  const transactions = data.transactions.filter(tx => (tx.wallets?.currency ?? walletCurrency(tx.wallet_id)) === currency);
  const wallets = activeWallets.filter(wallet => wallet.currency === currency);
  const income = transactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const expense = transactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const balance = wallets.reduce((sum, wallet) => sum + Number(wallet.balance ?? wallet.initial_balance), 0);
  const net = income - expense;
  const savingRate = income > 0 ? pct(net / income * 100) : '—';
  const uncategorized = id ? 'Tanpa kategori' : 'Uncategorized';
  const byCategory = new Map<string, { name: string; value: number; color: string }>();
  const palette = ['#7556bd', '#e67728', '#2f9569', '#368ab7', '#d45066', '#c59a21'];
  for (const tx of transactions.filter(tx => tx.type === 'expense')) {
    const key = tx.category_id || 'uncategorized';
    const category = byCategory.get(key) ?? { name: tx.categories?.name ?? uncategorized, value: 0, color: /^#[0-9a-f]{6}$/i.test(tx.categories?.color ?? '') ? tx.categories!.color : palette[byCategory.size % palette.length] };
    category.value += Number(tx.amount);
    byCategory.set(key, category);
  }
  const categories = [...byCategory.values()].sort((a, b) => b.value - a.value);
  const categoryChart = categories.slice(0, 5);
  if (categories.length > 5) categoryChart.push({ name: id ? 'Lainnya' : 'Other', value: categories.slice(5).reduce((sum, row) => sum + row.value, 0), color: '#8a8992' });
  const movement = new Map<string, number>();
  for (const tx of transactions) movement.set(tx.transaction_date, (movement.get(tx.transaction_date) ?? 0) + (tx.type === 'income' ? 1 : -1) * Number(tx.amount));
  const trend = Array.from({ length: Number(month.end.slice(8)) }, (_, index) => String(index + 1).padStart(2, '0'))
    .reduce<{ name: string; value: number }[]>((rows, day) => {
      const previous = rows.at(-1)?.value ?? 0;
      return [...rows, { name: day, value: previous + (movement.get(`${month.month}-${day}`) ?? 0) }];
    }, []);
  const amount = (value: number, code = currency) => <PrivacyAmount value={formatMoney(value, code)} currency={code} />;
  const monthUrl = (value: string) => `/finance?month=${value}&currency=${encodeURIComponent(currency)}`;
  const latest = transactions.slice(0, 5);
  const budgets = currency === 'IDR' ? data.budgets : [];
  const netWorth = data.netWorth.filter(snapshot => snapshot.snapshot_date <= month.end).slice(-8);
  const netWorthValue = (snapshot: (typeof netWorth)[number]) => Number(snapshot.assets_amount) - Number(snapshot.liabilities_amount);
  const walletTypes: Record<string, string> = id ? { cash: 'Tunai', bank: 'Bank', ewallet: 'Dompet digital', crypto: 'Kripto' } : { cash: 'Cash', bank: 'Bank', ewallet: 'Digital wallet', crypto: 'Crypto' };

  return <Shell title={id ? 'Keuangan' : 'Finance'} quickFab={false}>
    <div className="financeDashboard">
      <div className="financeToolbar">
        <Link className="btn financePrimary" href="/finance/transactions/new"><Plus size={17} aria-hidden="true" />{id ? 'Tambah transaksi' : 'Add transaction'}</Link>
        <div className="financePeriod">
          <Link className="financeIconButton" href={monthUrl(shiftFinanceMonth(month.month, -1))} aria-label={id ? 'Bulan sebelumnya' : 'Previous month'}><ChevronLeft size={19} /></Link>
          <form action="/finance" className="financePeriodForm" key={`${month.month}-${currency}`}>
            <label className="srOnly" htmlFor="finance-month">{id ? 'Pilih bulan' : 'Select month'}</label>
            <input id="finance-month" name="month" type="month" defaultValue={month.month} required min="1000-01" max="9999-12" />
            <input type="hidden" name="currency" value={currency} />
            <button type="submit" className="financeTextButton">{id ? 'Lihat' : 'View'}</button>
          </form>
          <Link className="financeIconButton" href={monthUrl(shiftFinanceMonth(month.month, 1))} aria-label={id ? 'Bulan berikutnya' : 'Next month'}><ChevronRight size={19} /></Link>
          <Link className="financeTextButton" href={`/finance?currency=${encodeURIComponent(currency)}`}>{id ? 'Bulan ini' : 'This month'}</Link>
        </div>
        <form action="/finance" className="financeCurrencyForm" key={currency}>
          <input type="hidden" name="month" value={month.month} />
          <label className="srOnly" htmlFor="finance-currency">{id ? 'Mata uang' : 'Currency'}</label>
          <select id="finance-currency" name="currency" defaultValue={currency}>{currencies.map(code => <option key={code}>{code}</option>)}</select>
          <button className="financeTextButton" type="submit">{id ? 'Terapkan' : 'Apply'}</button>
        </form>
      </div>
      <nav className="financeModuleNav" aria-label={id ? 'Menu keuangan' : 'Finance menu'}>
        <Link href="/finance" aria-current="page">{id ? 'Ringkasan' : 'Overview'}</Link>
        <Link href="/finance/transactions">{c.transactionsTitle}</Link><Link href="/finance/wallets">{c.walletsTitle}</Link>
        <Link href="/finance/budgets">{id ? 'Anggaran' : 'Budgets'}</Link><Link href="/finance/reports">{c.reportsTitle}</Link>
        <Link href="/finance/settings">{c.settingsTitle}</Link>
      </nav>
      {!activeWallets.length && <section className="financeOnboarding">
        <span className="financeWalletIcon"><Wallet size={24} aria-hidden="true" /></span>
        <div><h2>{id ? 'Mulai dari dompet pertama' : 'Start with your first wallet'}</h2><p>{id ? 'Buat dompet, siapkan kategori, lalu catat transaksi pertamamu.' : 'Create a wallet, set up categories, then record your first transaction.'}</p></div>
        <Link className="btn financePrimary" href="/finance/wallets">{c.createWallet}</Link>
      </section>}
      {activeWallets.length > 0 && !data.categories.length && <div className="financeSetupNote"><span>{id ? 'Siapkan kategori sebelum mencatat transaksi.' : 'Set up categories before recording a transaction.'}</span><Link href="/finance/settings">{id ? 'Siapkan kategori' : 'Set up categories'}<ArrowUpRight size={16} aria-hidden="true" /></Link></div>}

      <div className="financeWidgetGrid">
        <section className="financeWidget financeHero" aria-labelledby="finance-flow-title">
          <header className="financeWidgetHeader"><h2 id="finance-flow-title">{id ? 'Tren arus kas' : 'Cash flow trend'}</h2><PrivacyToggleButton /></header>
          <div className="financeHeroValue"><strong className={net < 0 ? 'negative' : ''}>{amount(net)}</strong><span>{periodLabel} · {currency}</span></div>
          <div className="financeHeroMetrics">
            <div><span>{c.income}</span><b className="positive">{amount(income)}</b></div>
            <div><span>{c.expense}</span><b className="negative">{amount(expense)}</b></div>
            <div><span>{c.savingRate}</span><b>{savingRate}</b></div>
          </div>
          {transactions.length ? <><p className="financeChartCaption">{id ? 'Akumulasi pemasukan dikurangi pengeluaran setiap hari' : 'Cumulative income minus expenses each day'}</p><TrendLine data={trend} currency={currency} lang={lang} /></> : <div className="financeEmpty financeHeroEmpty"><span>{id ? 'Belum ada transaksi pada bulan ini.' : 'No transactions in this month.'}</span><Link href={`/finance/transactions/new?date=${month.start}`}>{id ? 'Catat transaksi pertama' : 'Record your first transaction'}<ArrowUpRight size={16} aria-hidden="true" /></Link></div>}
          <Link className="financeFooterLink" href={`/finance/reports/${month.month}`}>{id ? 'Buka laporan bulanan' : 'Open monthly report'}<ArrowUpRight size={15} aria-hidden="true" /></Link>
        </section>

        <section className="financeWidget financeRecent" aria-labelledby="finance-recent-title">
          <header className="financeWidgetHeader"><h2 id="finance-recent-title">{id ? 'Transaksi terbaru' : 'Latest transactions'}</h2><Link className="financeIconButton" href={`/finance/transactions?date=${latest[0]?.transaction_date ?? month.start}`} aria-label={c.viewAll}><ArrowUpRight size={18} /></Link></header>
          <p className="financeWidgetSubtitle">{periodLabel}</p>
          {latest.length ? <div className="financeRows">{latest.map(tx => <Link className="financeTransaction" key={tx.id} href={`/finance/transactions/${tx.id}/edit`}>
            <span className={`financeTransactionIcon ${tx.type}`} aria-hidden="true">{tx.type === 'income' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span>
            <span className="financeRowText"><b>{tx.note || tx.categories?.name || uncategorized}</b><small>{tx.categories?.name ?? uncategorized} · {tx.wallets?.name ?? data.wallets.find(wallet => wallet.id === tx.wallet_id)?.name}</small></span>
            <span className="financeRowAmount"><b className={tx.type === 'income' ? 'positive' : 'negative'}>{tx.type === 'income' ? '+' : '−'}{amount(Number(tx.amount))}</b><small>{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(`${tx.transaction_date}T12:00:00`))}</small></span>
          </Link>)}</div> : <div className="financeEmpty"><span>{id ? 'Catatan transaksi muncul di sini.' : 'Your recorded transactions appear here.'}</span><Link href="/finance/transactions/new">{id ? 'Tambah transaksi' : 'Add transaction'}<Plus size={15} aria-hidden="true" /></Link></div>}
        </section>

        <section className="financeWidget" aria-labelledby="finance-expenses-title">
          <header className="financeWidgetHeader"><h2 id="finance-expenses-title">{id ? 'Struktur pengeluaran' : 'Expense structure'}</h2></header>
          <p className="financeWidgetSubtitle">{periodLabel} · {currency}</p>
          {categoryChart.length ? <><ExpensePie data={categoryChart} currency={currency} lang={lang} donut /><div className="financeCategoryLegend">{categoryChart.map(category => <div key={category.name}><span><i style={{ background: category.color }} />{category.name}</span><b>{amount(category.value)}</b></div>)}</div></> : <div className="financeEmpty"><span>{id ? 'Kategori terlihat setelah pengeluaran dicatat.' : 'Categories appear after you record an expense.'}</span></div>}
        </section>

        <section className="financeWidget" aria-labelledby="finance-budgets-title">
          <header className="financeWidgetHeader"><h2 id="finance-budgets-title">{id ? 'Anggaran' : 'Budgets'}</h2><Link className="financeIconButton" href="/finance/budgets" aria-label={id ? 'Kelola anggaran' : 'Manage budgets'}><ArrowUpRight size={18} /></Link></header>
          <p className="financeWidgetSubtitle">{periodLabel} · IDR</p>
          {budgets.length ? <div className="financeBudgetList">{budgets.slice(0, 5).map(budget => {
            const spent = transactions.filter(tx => tx.type === 'expense' && tx.category_id === budget.category_id).reduce((sum, tx) => sum + Number(tx.amount), 0);
            const limit = Number(budget.amount);
            const progress = limit > 0 ? spent / limit * 100 : 0;
            return <Link href="/finance/budgets" key={budget.id} className="financeBudget"><div><b>{budget.categories?.name ?? uncategorized}</b><span className={spent > limit ? 'negative' : ''}>{limit > 0 ? `${Math.round(progress)}%` : '—'}</span></div><progress max={100} value={Math.min(100, progress)} aria-label={budget.categories?.name ?? uncategorized} className={spent > limit ? 'overBudget' : ''} /><small>{amount(spent, 'IDR')} / {amount(limit, 'IDR')}</small><span className={spent > limit ? 'negative' : 'muted'}>{spent > limit ? (id ? 'Melebihi anggaran ' : 'Over budget ') : (id ? 'Sisa ' : 'Remaining ')}{amount(Math.abs(limit - spent), 'IDR')}</span></Link>;
          })}</div> : <div className="financeEmpty"><span>{currency !== 'IDR' ? (id ? 'Anggaran dicatat dalam IDR. Pilih IDR untuk melihat progresnya.' : 'Budgets use IDR. Select IDR to view their progress.') : (id ? 'Atur batas pengeluaran per kategori agar lebih terkendali.' : 'Set spending limits for each category to stay on track.')}</span><Link href="/finance/budgets">{id ? 'Kelola anggaran' : 'Manage budgets'}<ArrowUpRight size={15} aria-hidden="true" /></Link></div>}
        </section>

        <section className="financeWidget" aria-labelledby="finance-wallets-title">
          <header className="financeWidgetHeader"><h2 id="finance-wallets-title">{c.wallet}</h2><Link className="financeIconButton" href="/finance/wallets" aria-label={id ? 'Kelola dompet' : 'Manage wallets'}><ArrowUpRight size={18} /></Link></header>
          <div className="financeWalletBalance"><span>{id ? 'Saldo saat ini' : 'Current balance'} · {currency}</span><strong>{amount(balance)}</strong></div>
          {wallets.length ? <div className="financeRows">{wallets.map(wallet => <Link className="financeWalletRow" key={wallet.id} href={`/finance/wallets/${wallet.id}/edit`}><span className="financeWalletIcon"><Wallet size={18} aria-hidden="true" /></span><span className="financeRowText"><b>{wallet.name}</b><small>{walletTypes[wallet.type] ?? wallet.type}</small></span><b>{amount(Number(wallet.balance ?? wallet.initial_balance))}</b></Link>)}</div> : <div className="financeEmpty"><span>{id ? 'Belum ada dompet aktif untuk mata uang ini.' : 'No active wallets in this currency.'}</span><Link href="/finance/wallets">{c.createWallet}<Plus size={15} aria-hidden="true" /></Link></div>}
        </section>

        <section className="financeWidget financeNetWorth" aria-labelledby="finance-networth-title">
          <header className="financeWidgetHeader"><h2 id="finance-networth-title">{c.trackNetWorth}</h2><Link className="financeIconButton" href="/finance/net-worth" aria-label={c.trackNetWorth}><ArrowUpRight size={18} /></Link></header>
          <p className="financeWidgetSubtitle">{id ? 'Snapshot terakhir sampai' : 'Latest snapshot through'} {periodLabel} · IDR</p>
          {netWorth.length ? <><div className="financeNetWorthValue">{amount(netWorthValue(netWorth[netWorth.length - 1]), 'IDR')}</div><TrendLine data={netWorth.map(snapshot => ({ name: snapshot.snapshot_date, value: netWorthValue(snapshot) }))} lang={lang} currency="IDR" /></> : <div className="financeEmpty"><span>{id ? 'Catat aset dan kewajiban untuk melihat kekayaan bersih.' : 'Record assets and liabilities to track your net worth.'}</span><Link href="/finance/net-worth">{id ? 'Catat snapshot' : 'Record snapshot'}<Plus size={15} aria-hidden="true" /></Link></div>}
        </section>
        <section className="financeWidget financeTools" aria-labelledby="finance-tools-title"><h2 id="finance-tools-title">{id ? 'Alat keuangan' : 'Finance tools'}</h2><Link href="/finance/loans">{id ? 'Utang & piutang' : 'Loans & lending'}<ArrowUpRight size={17} aria-hidden="true" /></Link><Link href="/finance/btc">{c.trackBtcDca}<ArrowUpRight size={17} aria-hidden="true" /></Link><Link href="/finance/settings">{id ? 'Kategori & cadangan data' : 'Categories & data backup'}<ArrowUpRight size={17} aria-hidden="true" /></Link></section>
      </div>
    </div>
  </Shell>;
}
