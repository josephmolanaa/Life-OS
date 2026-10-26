'use client';

import { useState, useEffect } from 'react';
import { Shell } from '@/components/finance/layout';
import { getLang, copy, type Translation } from '@/lib/i18n';
import { Users, Clock } from 'lucide-react';
import { ContentSkeleton } from '@/components/app-loading';

type SocialActivity = { app: string; window?: string; minutes: number };

const SOCIAL_APPS = ['discord', 'whatsapp', 'telegram', 'twitter', 'instagram', 'facebook'];

export default function SocialPage() {
  const [t, setT] = useState<Translation>(copy.en);
  const [socialStats, setSocialStats] = useState<SocialActivity[]>([]);
  const [totalTime, setTotalTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState('');
  const [retry, setRetry] = useState(0);
  const [id, setId] = useState(false);

  useEffect(() => {
    getLang().then(l => {
      setT(copy[l]); setId(l === 'id');
    });

    const controller = new AbortController();
    async function loadStats() {
      setLoading(true); setError(false);
      try {
        const today = new Date();
        const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const response = await fetch(`/api/activitywatch-data?date=${date}&range=1d`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to fetch activity');
        
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (/no cached data/i.test(data.status || '')) throw new Error('Activity unavailable');
        setStatus(data.status || '');
        const activities = Array.isArray(data.items) ? data.items : [];
        
        const filtered = activities.filter((act: SocialActivity) =>
          typeof act.app === 'string' && Number.isFinite(act.minutes) && act.minutes >= 0 && (SOCIAL_APPS.some(app => act.app.toLowerCase().includes(app)) || /(?:^|[\s/:.])(discord\.com|web\.whatsapp\.com|web\.telegram\.org|twitter\.com|x\.com|instagram\.com|facebook\.com)(?:[\s/:]|$)/i.test(act.window || ''))
        );
        
        setSocialStats(filtered);
        
        const total = filtered.reduce((acc: number, act: SocialActivity) => acc + (act.minutes || 0), 0);
        setTotalTime(total);
      } catch {
        if (!controller.signal.aborted) { setError(true); setSocialStats([]); }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadStats();
    return () => controller.abort();
  }, [retry]);

  return (
    <Shell title={t.socialTitle} quickFab={false}>
      <div className="card">
        <div className="row" style={{ marginBottom: '16px' }}>
          <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} className="card-icon" />
            <span>{t.socialScreenTime.toUpperCase()}</span>
          </div>
          <div className="big">{loading || error ? "—" : Math.round(totalTime)} <span style={{ fontSize: '16px' }}>{t.minutes}</span></div>
        </div>

        {status && !loading && !error && <p className="muted">{status}</p>}
        <div className="list">
          {loading ? (
            <ContentSkeleton variant="social" />
          ) : error ? (<div role="alert"><p>{id ? 'Data aktivitas belum tersedia. Ini bukan berarti aktivitasmu nol.' : 'Activity data is unavailable. This does not mean zero activity.'}</p><button className="btn" onClick={() => setRetry(n => n + 1)}>{id ? 'Coba lagi' : 'Retry'}</button></div>) : socialStats.length > 0 ? (
            socialStats.map((act: SocialActivity, idx: number) => (
              <div key={idx} className="item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div className="nav-icon" style={{ background: 'var(--surface2)', padding: '6px', borderRadius: '50%', flexShrink: 0 }}>
                    <Clock size={16} className="muted" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{act.app}</div>
                    <small className="muted" style={{ display: 'block', overflowWrap: 'anywhere' }}>{act.window}</small>
                  </div>
                </div>
                <span className="pill" style={{ flexShrink: 0 }}>{Math.round(act.minutes)} min</span>
              </div>
            ))
          ) : (
            <div className="empty">{t.noSocialActivity}</div>
          )}
        </div>
      </div>
    </Shell>
  );
}
