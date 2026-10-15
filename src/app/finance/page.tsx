import { Shell } from '@/components/finance/layout';
import { FinanceHomeClient } from '@/components/finance/finance-home-client';
import Link from 'next/link';
import { copy, getLang } from '@/lib/i18n';
import { money, pct } from '@/lib/finance';
import { requireFinance, totals } from '@/lib/data';

export default async function FinanceHome() {
  const lang = await getLang();
  const c = copy[lang];
  const data = await requireFinance();
  const t = totals(data);
  const activeWallets = data.wallets.filter(w => !w.is_archived);

  return <Shell title={c.financeHome}>
    <nav className="reportTabs" aria-label={c.commonSettings}>
      <Link className="reportTab" href="/finance/transactions">{c.transactionsTitle}</Link>
      <Link className="reportTab" href="/finance/wallets">{c.walletsTitle}</Link>
      <Link className="reportTab" href="/finance/budgets">{c.setMonthlyBudget}</Link>
      <Link className="reportTab" href="/finance/btc">{c.trackBtcDca}</Link>
      <Link className="reportTab" href="/finance/net-worth">{c.trackNetWorth}</Link>
      <Link className="reportTab" href="/finance/settings">{c.settingsTitle}</Link>
    </nav>
    <FinanceHomeClient
      summaries={[
        { id: 'balance', label: c.totalBalance, value: money.format(t.totalBalance), helper: c.totalBalanceHelp, mask: true },
        { id: 'income', label: c.monthlyIncome, value: money.format(t.income), tone: 'positive', helper: c.monthlyIncomeHelp, mask: true },
        { id: 'expense', label: c.monthlyExpense, value: money.format(t.expense), tone: 'negative', helper: c.monthlyExpenseHelp, mask: true },
        { id: 'saving-rate', label: c.savingRate, value: pct(t.savingRate), helper: c.savingRateHelp },
      ]}
      wallets={activeWallets.map(wallet => ({ id: wallet.id, name: wallet.name, type: wallet.type, currency: wallet.currency, balance: wallet.balance }))}
      walletTitle={c.wallet}
      walletHelp={c.walletHelp}
      viewAll={c.viewAll}
      empty={{ title: c.noWallet, text: c.noWalletText, href: '/finance/wallets', label: c.createWallet }}
    />
  </Shell>;
}
