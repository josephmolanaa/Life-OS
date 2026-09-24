'use client';

import { useState, useEffect } from 'react';
import { Shell } from '@/components/finance/layout';
import { getLang, copy, type Lang, type Translation } from '@/lib/i18n';
import { Users, Clock } from 'lucide-react';

const SOCIAL_APPS = ['discord', 'whatsapp', 'telegram', 'twitter', 'instagram', 'facebook'];

export default function SocialPage() {
  const [lang, setLang] = useState<Lang>('en');
  const [t, setT] = useState<Translation>(copy.en);
  const [socialStats, setSocialStats] = useState<any[]>([]);
  const [totalTime, setTotalTime] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLang().then(l => {
      setLang(l);
      setT(copy[l]);
    });

    async function loadStats() {
      setLoading(true);
      try {
        const date = new Date().toISOString().split('T')[0];
        const response = await fetch(`/api/activitywatch-data?date=${date}&range=1d`);
        if (!response.ok) throw new Error('Failed to fetch activity');
        
        const data = await response.json();
        const activities = data.items || [];
        
        const filtered = activities.filter((act: any) => 
          SOCIAL_APPS.some(app => act.app.toLowerCase().includes(app))
        );
        
        setSocialStats(filtered);
        
        const total = filtered.reduce((acc: number, act: any) => acc + (act.minutes || 0), 0);
        setTotalTime(total);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <Shell title={t.socialTitle} quickFab={false}>
      <div className="card">
        <div className="row" style={{ marginBottom: '16px' }}>
          <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} className="card-icon" />
            <span>{t.socialScreenTime.toUpperCase()}</span>
          </div>
          <div className="big positive">{Math.round(totalTime)} <span style={{ fontSize: '16px' }}>{t.minutes}</span></div>
        </div>

        <div className="list">
          {loading ? (
            <div className="muted">{t.loading}</div>
          ) : socialStats.length > 0 ? (
            socialStats.map((act: any, idx: number) => (
              <div key={idx} className="item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="nav-icon" style={{ background: 'var(--surface2)', padding: '6px', borderRadius: '50%' }}>
                    <Clock size={16} className="muted" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{act.app}</div>
                    <small className="muted">{act.title}</small>
                  </div>
                </div>
                <span className="pill">{Math.round(act.minutes)} min</span>
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
