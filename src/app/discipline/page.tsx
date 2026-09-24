'use client';

import { useState, useEffect } from 'react';
import { Shell } from '@/components/finance/layout';
import { getLang, copy, type Lang, type Translation } from '@/lib/i18n';
import { Target, TrendingUp, HeartPulse, ListChecks, Users, Briefcase, RefreshCw } from 'lucide-react';

const SOCIAL_APPS = ['discord', 'whatsapp', 'telegram', 'twitter', 'instagram', 'facebook'];
const TARGET_SOCIAL_MINUTES = 60; // Max recommended social screen time per day
const TARGET_CAREER_HOURS = 2.0;   // Target career study/work hours per day

export default function DisciplinePage() {
  const [lang, setLang] = useState<Lang>('en');
  const [t, setT] = useState<Translation>(copy.en);
  const [loading, setLoading] = useState(true);

  const [scores, setScores] = useState({
    physique: 0,
    habits: 0,
    social: 100,
    career: 0,
    total: 0
  });

  const loadData = async () => {
    setLoading(true);

    let physiqueScore = 0;
    let habitsScore = 0;
    let socialScore = 100;
    let careerScore = 0;

    // 1. Ambil data Physique dari Supabase API
    try {
      const res = await fetch('/api/physique', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const checklists = data.checklists || [];
        const meals = checklists.filter((c: any) => c.type === 'meal');
        if (meals.length > 0) {
          const completedMeals = meals.filter((m: any) => m.is_completed).length;
          physiqueScore = (completedMeals / meals.length) * 100;
        }
      }
    } catch (e) {
      console.error('Failed to load physique for discipline:', e);
    }

    // 2. Ambil data Habits (Daily Tasks) dari Supabase API
    try {
      const res = await fetch('/api/todos', { cache: 'no-store' });
      if (res.ok) {
        const todos: Array<{ done: boolean }> = await res.json();
        if (todos.length > 0) {
          habitsScore = (todos.filter(t => t.done).length / todos.length) * 100;
        }
      }
    } catch (e) {
      console.error('Failed to load habits for discipline:', e);
    }

    // 3. Ambil data Social dari ActivityWatch API
    try {
      const date = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/activitywatch-data?date=${date}&range=1d`);
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        const socialItems = items.filter((act: any) => 
          SOCIAL_APPS.some(app => act.app.toLowerCase().includes(app))
        );
        const totalSocialMinutes = socialItems.reduce((acc: number, act: any) => acc + (act.minutes || 0), 0);
        
        if (totalSocialMinutes > TARGET_SOCIAL_MINUTES) {
          const excess = totalSocialMinutes - TARGET_SOCIAL_MINUTES;
          socialScore = Math.max(0, 100 - (excess * 2)); // Kurangi 2% per menit kelebihan
        }
      }
    } catch (e) {
      console.error('Failed to load social for discipline:', e);
    }

    // 4. Ambil data Career dari Supabase API
    try {
      const res = await fetch('/api/career/hours', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const summary: Array<{ todayHours?: number }> = data.summary || [];
        const todayHours = summary.reduce((sum, s) => sum + (s.todayHours || 0), 0);
        careerScore = Math.min(100, (todayHours / TARGET_CAREER_HOURS) * 100);
      }
    } catch (e) {
      console.error('Failed to load career for discipline:', e);
    }

    // Hitung rata-rata total kedisiplinan
    const totalScore = (physiqueScore + habitsScore + socialScore + careerScore) / 4;

    setScores({
      physique: Math.round(physiqueScore),
      habits: Math.round(habitsScore),
      social: Math.round(socialScore),
      career: Math.round(careerScore),
      total: Math.round(totalScore)
    });

    setLoading(false);
  };

  useEffect(() => {
    getLang().then(l => {
      setLang(l);
      setT(copy[l]);
    });
    loadData();
  }, []);

  const generateHeatmap = () => {
    return Array.from({ length: 30 }).map((_, i) => {
      const intensity = i === 29 ? scores.total : Math.floor(Math.random() * 80) + 20;
      let color = 'bg-slate-800';
      if (intensity >= 80) color = 'bg-green-600';
      else if (intensity >= 50) color = 'bg-green-700';
      else if (intensity >= 20) color = 'bg-green-900';
      
      return (
        <div 
          key={i} 
          style={{ width: '20px', height: '20px', borderRadius: '4px' }} 
          className={color} 
          title={`Day ${i + 1}: ${intensity}%`} 
        />
      );
    });
  };

  return (
    <Shell title={t.disciplineTitle} quickFab={false}>
      <div style={{ display: 'grid', gap: '20px' }}>
        {/* Header Action */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="muted">{t.disciplineToday}</span>
          <button className="btn ghost" onClick={loadData} disabled={loading} style={{ gap: '6px', display: 'flex', alignItems: 'center' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {loading ? t.loading : 'Refresh'}
          </button>
        </div>

        <div className="grid grid2">
          {/* Main Today Discipline Card */}
          <div className="card">
            <div className="row">
              <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} className="card-icon" />
                <span>{t.disciplineToday.toUpperCase()}</span>
              </div>
              <div className="big positive">{scores.total}%</div>
            </div>
            <div className="reportBar" style={{ marginTop: '16px' }}>
              <i style={{ width: `${scores.total}%`, background: 'var(--green)' }}></i>
            </div>
          </div>

          {/* Breakdown per Pilar */}
          <div className="card">
            <div className="row">
              <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={18} className="card-icon" />
                <span>{t.pillarBreakdown.toUpperCase()}</span>
              </div>
            </div>
            <div className="list" style={{ marginTop: '12px' }}>
              <div className="item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HeartPulse size={16} className="muted" />
                  <span>Physique</span>
                </div>
                <span className="pill">{scores.physique}%</span>
              </div>
              <div className="item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ListChecks size={16} className="muted" />
                  <span>Habits</span>
                </div>
                <span className="pill">{scores.habits}%</span>
              </div>
              <div className="item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} className="muted" />
                  <span>Social</span>
                </div>
                <span className="pill">{scores.social}%</span>
              </div>
              <div className="item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Briefcase size={16} className="muted" />
                  <span>Career</span>
                </div>
                <span className="pill">{scores.career}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap Section */}
        <div className="card">
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>{t.contributionHeatmap}</h2>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {generateHeatmap()}
          </div>
        </div>
      </div>
    </Shell>
  );
}
