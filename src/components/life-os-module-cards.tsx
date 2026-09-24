'use client';

import { Activity, CreditCard } from 'lucide-react';
import { PrivacyAmount } from './finance/privacy-amount';
import NextLink from 'next/link';

type AwCategory = { category: string; minutes: number };

const categoryEmojis: Record<string, string> = {
  work: '💼',
  play: '🏃',
  learn: '📚',
  admin: '⚙️',
  social: '💬',
  health: '💚',
  uncategorized: '❓',
};

const categoryColors: Record<string, string> = {
  work: '#3b82f6',
  play: '#ec4899',
  learn: '#10b981',
  admin: '#6b7280',
  social: '#f59e0b',
  health: '#84cc16',
  uncategorized: '#64748b'
};

function fmt(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

export function ModuleCards({
  financeSummary,
  awStatus,
  awCategories,
}: {
  financeSummary: { income: number; expense: number };
  awStatus: string;
  awCategories: AwCategory[];
}) {
  const maxMinutes = Math.max(...awCategories.map(c => c.minutes), 1);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
      <article className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Finance Module</h2>
          <CreditCard size={18} className="muted" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px', flex: 1 }}>
          <div style={{ padding: '20px 16px', background: 'var(--surface2)', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="muted" style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 600 }}>Income</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--green)', marginTop: '8px' }}>
              <PrivacyAmount value={`Rp ${financeSummary.income.toLocaleString('id-ID')}`} />
            </div>
          </div>
          <div style={{ padding: '20px 16px', background: 'var(--surface2)', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="muted" style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 600 }}>Expense</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--red)', marginTop: '8px' }}>
              <PrivacyAmount value={`Rp ${financeSummary.expense.toLocaleString('id-ID')}`} />
            </div>
          </div>
        </div>
        <NextLink href="/finance" style={{ textDecoration: 'none', marginTop: 'auto' }}>
          <button style={{ width: '100%', padding: '10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            View Details
          </button>
        </NextLink>
      </article>

      <article className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Activity Watch</h2>
          <Activity size={18} className="muted" />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <div className="muted" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>Status</div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: awStatus === 'Offline' ? 'var(--red)' : 'var(--green)' }}>
            {awStatus}
          </div>
        </div>
        <div style={{ display: 'grid', gap: '12px' }}>
          {awCategories.slice(0, 5).map((cat) => {
            const pct = Math.round((cat.minutes / maxMinutes) * 100);
            const color = categoryColors[cat.category] || 'var(--accent)';
            return (
              <div key={cat.category} style={{ display: 'grid', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                    {categoryEmojis[cat.category] || '📌'} {cat.category}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text2)' }}>{fmt(cat.minutes)}</span>
                </div>
                <div style={{ height: '6px', background: 'var(--border2)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px' }} />
                </div>
              </div>
            );
          })}
        </div>
      </article>
    </div>
  );
}


