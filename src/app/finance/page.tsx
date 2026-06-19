import { Shell } from '@/components/finance/layout';
import { FinanceHomeClient } from '@/components/finance/finance-home-client';
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
    <FinanceHomeClient
      summaries={[
        { label: c.totalBalance, value: money.format(t.totalBalance), helper: c.totalBalanceHelp, mask: true },
        { label: c.monthlyIncome, value: money.format(t.income), tone: 'positive', helper: c.monthlyIncomeHelp, mask: true },
        { label: c.monthlyExpense, value: money.format(t.expense), tone: 'negative', helper: c.monthlyExpenseHelp, mask: true },
        { label: c.savingRate, value: pct(t.savingRate), helper: c.savingRateHelp },
      ]}
      wallets={activeWallets.map(wallet => ({ id: wallet.id, name: wallet.name, type: wallet.type, currency: wallet.currency, balance: wallet.balance }))}
      walletTitle={c.wallet}
      walletHelp={c.walletHelp}
      viewAll={c.viewAll}
      empty={{ title: c.noWallet, text: c.noWalletText, href: '/finance/wallets', label: c.createWallet }}
    />
  </Shell>;
}
