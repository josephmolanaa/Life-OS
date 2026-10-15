'use client';

import Link from 'next/link';
import { formatMoney } from '@/lib/finance';
import { usePrivacy } from '@/components/finance/privacy-context';
import { PrivacyToggleButton } from '@/components/finance/privacy-toggle-button';

type Wallet = { id: string; name: string; type: string; currency: string; balance?: number | null };

type Summary = { id: string; label: string; value: string; tone?: 'positive' | 'negative'; helper?: string; mask?: boolean };

export function FinanceHomeClient({ summaries, wallets, walletTitle, walletHelp, viewAll, empty }: { summaries: Summary[]; wallets: Wallet[]; walletTitle: string; walletHelp: string; viewAll: string; empty: { title: string; text: string; href: string; label: string } }) {
  const { hidden, maskValue, maskCurrency } = usePrivacy();

  return <>
    <section className="grid grid2 metricGrid">
      {summaries.map((summary, index) => <div className={`card summary ${index === 0 ? 'balanceSummary' : ''}`} key={summary.id}>
        <div className="muted">{summary.label}</div>
        <div className={index === 0 ? 'balanceValueRow' : undefined}>
          <div className={`big ${summary.tone ?? ''}`}>{hidden && summary.mask ? maskValue(summary.value) : summary.value}</div>
          {index === 0 && <PrivacyToggleButton />}
        </div>
        {summary.helper && <small className="muted">{summary.helper}</small>}
      </div>)}
    </section>

    <section className="card walletPanel">
      <div className="row"><div><b>{walletTitle}</b><p className="muted noMargin">{walletHelp}</p></div><Link className="pill" href="/finance/wallets">{viewAll}</Link></div>
      <div className="list spaced">
        {wallets.length === 0 && <div className="empty"><b>{empty.title}</b><p className="muted">{empty.text}</p><Link className="btn" href={empty.href}>{empty.label}</Link></div>}
        {wallets.map(wallet => <Link className="item walletItem" key={wallet.id} href={`/finance/wallets/${wallet.id}/edit`}><span><b>{wallet.name}</b><br/><small className="muted">{wallet.type} - {wallet.currency}</small></span><b>{hidden ? maskCurrency(wallet.currency) : formatMoney(Number(wallet.balance ?? 0), wallet.currency)}</b></Link>)}
      </div>
    </section>
  </>;
}
