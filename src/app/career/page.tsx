"use client";

import { useCallback, useEffect, useState } from 'react';
import { Shell } from '@/components/finance/layout';
import type { CareerSkill, SkillHoursSummary, CareerBranch } from '@/lib/career-types';
import { Briefcase, TrendingUp, Users, Zap, Target, Clock, BookOpen, RefreshCw } from 'lucide-react';

const BRANCH_META: Record<CareerBranch, { label: string; color: string; bg: string; icon: typeof Briefcase }> = {
  ai_engineer: { label: 'AI Engineer', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', icon: Briefcase },
  economics: { label: 'Economics', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', icon: TrendingUp },
  soft_skills: { label: 'Soft Skills', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: Users },
};

const BRANCHES: CareerBranch[] = ['ai_engineer', 'economics', 'soft_skills'];

type SkillWithHours = CareerSkill & Partial<SkillHoursSummary>;

export default function CareerPage() {
  const [skills, setSkills] = useState<SkillWithHours[]>([]);
  const [summary, setSummary] = useState<SkillHoursSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const skillsRes = await fetch('/api/career/skills', { cache: 'no-store' });
      const skillsData: CareerSkill[] = await skillsRes.json();
      setSkills(skillsData);

      if (skillsData.length > 0) {
        const hoursRes = await fetch('/api/career/hours', { cache: 'no-store' });
        const hoursData: { summary?: SkillHoursSummary[] } = await hoursRes.json();
        const hoursSummary = hoursData.summary || [];
        setSummary(hoursSummary);

        const merged = skillsData.map((skill) => {
          const h = hoursSummary.find((s) => s.skillSlug === skill.slug);
          return { ...skill, ...h };
        });
        setSkills(merged);
      } else {
        setSummary([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal load career data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const seedSkills = async () => {
    setSeeding(true);
    setError('');
    try {
      const res = await fetch('/api/career/skills', { method: 'POST' });
      if (!res.ok) throw new Error('Seed gagal');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal seed skill default');
    } finally {
      setSeeding(false);
    }
  };

  const skillsByBranch = BRANCHES.reduce<Record<CareerBranch, SkillWithHours[]>>((acc, branch) => {
    acc[branch] = skills.filter((s) => s.branch === branch);
    return acc;
  }, { ai_engineer: [], economics: [], soft_skills: [] });

  const totalTodayHours = summary.reduce((sum, s) => sum + (s.todayHours || 0), 0);
  const totalWeekHours = summary.reduce((sum, s) => sum + (s.thisWeekHours || 0), 0);
  const totalLoggedHours = summary.reduce((sum, s) => sum + (s.loggedHours || 0), 0);
  const totalTargetHours = skills.reduce((sum, s) => sum + s.target_hours, 0);
  const overallProgress = totalTargetHours > 0 ? Math.round((totalLoggedHours / totalTargetHours) * 100) : 0;

  return (
    <Shell title="Career" quickFab={false}>
      <div style={{ display: 'grid', gap: '24px' }}>
        <header className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p className="muted" style={{ letterSpacing: '.32em', fontSize: '11px', textTransform: 'uppercase', margin: 0 }}>
                Career
             </p>
              <h1 className="big" style={{ margin: '8px 0 6px', fontSize: '28px' }}>
                AI Engineer + Investor
             </h1>
              <p className="muted" style={{ margin: 0 }}>
                Track skill growth across AI, Economics, and Soft Skills branches.
             </p>
           </div>
            <button className="btn ghost" type="button" onClick={loadAll} disabled={loading} style={{ gap: '6px' }}>
              <RefreshCw size={14} /> Refresh
           </button>
         </div>
       </header>

        {error && (
          <div className="card" style={{ padding: '16px', borderColor: '#ef4444' }}>
            <p style={{ margin: 0, color: '#ef4444' }}>{error}</p>
         </div>
        )}

        {!loading && skills.length === 0 && (
          <div className="card" style={{ padding: '32px', display: 'grid', gap: '12px', textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Belum ada skill terdaftar</h2>
            <p className="muted" style={{ margin: 0 }}>
              Seed skill default untuk mulai tracking.
           </p>
            <button className="btn" type="button" onClick={seedSkills} disabled={seeding} style={{ justifySelf: 'center' }}>
              {seeding ? 'Seeding...' : 'Seed Skill Default'}
           </button>
         </div>
        )}

        {!loading && skills.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '24px', background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '10px' }}>
                  <Zap size={20} />
               </div>
                <div>
                  <p className="muted" style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase' }}>Today</p>
                  <h3 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 700 }}>{totalTodayHours.toFixed(1)}h</h3>
               </div>
             </div>

              <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '24px', background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '10px' }}>
                  <Clock size={20} />
               </div>
                <div>
                  <p className="muted" style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase' }}>This Week</p>
                  <h3 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 700 }}>{totalWeekHours.toFixed(1)}h</h3>
               </div>
             </div>

              <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '24px', background: 'rgba(245, 158, 11, 0.1)', padding: '10px', borderRadius: '10px' }}>
                  <BookOpen size={20} />
               </div>
                <div>
                  <p className="muted" style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase' }}>Total Logged</p>
                  <h3 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 700 }}>{totalLoggedHours.toFixed(1)}h</h3>
               </div>
             </div>

              <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '24px', background: 'rgba(139, 92, 246, 0.1)', padding: '10px', borderRadius: '10px' }}>
                  <Target size={20} />
               </div>
                <div>
                  <p className="muted" style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase' }}>Progress</p>
                  <h3 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 700 }}>{overallProgress}%</h3>
               </div>
             </div>
           </div>

            {/* Desktop: 3 Columns, Mobile: 1 Column */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', alignItems: 'start' }}>
              {BRANCHES.map((branch) => {
                const meta = BRANCH_META[branch];
                const Icon = meta.icon;
                const branchSkills = skillsByBranch[branch];
                if (branchSkills.length === 0) return null;

                return (
                  <section key={branch} className="card" style={{ padding: '20px', height: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                      <div style={{ background: meta.bg, padding: '8px', borderRadius: '8px', color: meta.color }}>
                        <Icon size={18} />
                     </div>
                      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{meta.label}</h2>
                      <span className="muted" style={{ fontSize: '12px' }}>({branchSkills.length} skills)</span>
                   </div>

                    <div style={{ display: 'grid', gap: '12px' }}>
                      {branchSkills.map((skill) => {
                        const pct = skill.progressPct ?? 0;
                        const logged = skill.loggedHours ?? 0;
                        const today = skill.todayHours ?? 0;
                        const week = skill.thisWeekHours ?? 0;
                        return (
                          <div key={skill.id} style={{ display: 'grid', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', flexWrap: 'wrap', gap: '4px' }}>
                              <span style={{ fontWeight: 600 }}>{skill.name}</span>
                              <span className="muted" style={{ fontSize: '11px' }}>
                                {logged.toFixed(1)}h / {skill.target_hours}h
                                {today > 0 && (
                                  <span style={{ color: '#10b981', marginLeft: '6px', fontWeight: 600 }}>
                                    +{today.toFixed(1)}h today
                                 </span>
                                )}
                             </span>
                           </div>
                            <div style={{ background: 'var(--border2, #262522)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: '100%',
                                  background: meta.color,
                                  transition: 'width 0.3s ease',
                                  borderRadius: '4px',
                                }}
                              />
                           </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }} className="muted">
                              <span>{pct}% complete</span>
                              <span>This week: {week.toFixed(1)}h</span>
                           </div>
                         </div>
                        );
                      })}
                   </div>
                 </section>
                );
              })}
            </div>

            <div className="card" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ fontSize: '20px' }}>⚡</div>
              <div style={{ fontSize: '12px' }}>
                <strong>Data Mirror aktif</strong> Hours dihitung dari <code>activity_events_cache</code> (ActivityWatch) + <code>todos</code> (Habits ber-tag Career). Mapping: VS Code/PyTorch → Deep Learning, TradingView → Technical Analysis, dst.
             </div>
           </div>
          </>
        )}

        {loading && (
          <p className="muted" style={{ textAlign: 'center', padding: '40px 0' }}>Loading career data</p>
        )}
     </div>
   </Shell>
  );
}
