import { Activity, CreditCard } from 'lucide-react';
import { PrivacyAmount } from './finance/privacy-amount';
import NextLink from 'next/link';

type AwItem = { app: string; minutes: number };

export function ModuleCards({ financeSummary, awStatus, awApps }: { financeSummary: { income: number; expense: number }; awStatus: string; awApps: AwItem[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
      <article className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Finance Module</h2>
          <CreditCard size={18} className="muted" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
          <div style={{ padding: '12px', background: 'var(--surface2)', borderRadius: '8px' }}>
            <div className="muted" style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 600 }}>Income</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--green)', marginTop: '4px' }}><PrivacyAmount value={`Rp ${financeSummary.income.toLocaleString('id-ID')}`} /></div>
          </div>
          <div style={{ padding: '12px', background: 'var(--surface2)', borderRadius: '8px' }}>
            <div className="muted" style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 600 }}>Expense</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--red)', marginTop: '4px' }}><PrivacyAmount value={`Rp ${financeSummary.expense.toLocaleString('id-ID')}`} /></div>
          </div>
        </div>
        <NextLink href="/finance" className="btn" style={{ width: '100%', textAlign: 'center', textDecoration: 'none', display: 'block' }}>Go to Finance App</NextLink>
      </article>

      <article className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>ActivityWatch</h2>
          <Activity size={18} className="muted" />
        </div>
        <div style={{ marginBottom: '18px' }}>
          <p className="muted" style={{ fontSize: '12px', margin: '0 0 8px' }}>
            Status: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{awStatus}</span>
          </p>
          <div className="list" style={{ display: 'grid', gap: '2px' }}>
            {awApps.map((app) => (
              <div key={app.app} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border2)', fontSize: '13px' }}>
                <span style={{ color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{app.app}</span>
                <strong style={{ color: 'var(--text2)', fontFamily: 'monospace' }}>{app.minutes}m</strong>
              </div>
            ))}
          </div>
        </div>
        <NextLink href="/activitywatch" className="btn ghost" style={{ width: '100%', textAlign: 'center', textDecoration: 'none', display: 'block' }}>View Full Activity Log</NextLink>
      </article>
    </div>
  );
}
