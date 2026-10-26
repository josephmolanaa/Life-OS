import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { WalletForm } from '@/components/finance/wallet-form';
import { Shell } from '@/components/finance/layout';
import { requireFinance, totals } from '@/lib/data';
import { formatMoney, money } from '@/lib/finance';
import { copy, getLang } from '@/lib/i18n';
import { PrivacyAmount } from '@/components/finance/privacy-amount';
import { PrivacyToggleButton } from '@/components/finance/privacy-toggle-button';

export default async function Wallets() {
  const data = await requireFinance();
  const lang = await getLang();
  const c = copy[lang];
  const t = totals(data);

  return <Shell title={c.walletsTitle} quickFab={false}>
    <div className="editPageNav"><Link className="btn ghost" href="/finance">{String.fromCodePoint(8592)} {lang === 'id' ? 'Kembali ke Finance' : 'Back to Finance'}</Link></div>
    <div className="grid grid2"><div className="card summary balanceSummary"><div className="muted">{c.totalBalance}</div><div className="balanceValueRow"><div className="big"><PrivacyAmount value={money.format(t.totalBalance)}/></div><PrivacyToggleButton /></div></div><WalletForm className="card form desktopWalletForm"/></div>
    <div className="list walletList sectionGap">{data.wallets.filter(w => !w.is_archived).map(w => <Link className="item transactionItem" key={w.id} href={`/finance/wallets/${w.id}/edit`}><span className="transactionInfo">{w.name}<br/><small className="muted">{w.currency} - {w.type}</small></span><b className="transactionAmount"><PrivacyAmount value={formatMoney(Number(w.balance ?? 0), w.currency)} currency={w.currency}/></b><span className="transactionActions transactionArrow" aria-hidden="true"><ChevronRight size={18} strokeWidth={2.5}/></span></Link>)}</div>
    <details className="mobileWalletFab"><summary className="fab" aria-label="Add wallet">+</summary><div className="mobileWalletSheet"><WalletForm className="card form"/></div></details>
  </Shell>;
}
