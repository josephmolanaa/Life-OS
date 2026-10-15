'use client';

import { useState, useEffect, useRef } from 'react';
import { Shell } from '@/components/finance/layout';
import { ContentSkeleton } from '@/components/app-loading';
import { getLang, copy, type Translation } from '@/lib/i18n';
import { Scale, Utensils, CheckCircle2, Circle, Edit2, Save, Plus, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type Meal = { id: string; type: string; label: string; time_target: string; is_completed: boolean };

export default function PhysiquePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const [t, setT] = useState<Translation>(copy.en);

  const [startWeight, setStartWeight] = useState<number>(40);
  const [currentWeight, setCurrentWeight] = useState<number>(45);
  const [targetWeight, setTargetWeight] = useState<number>(70);
  const [isEditingWeight, setIsEditingWeight] = useState(false);
  const [weightLogs, setWeightLogs] = useState<Array<{ id: string; weight: number; recorded_at: string }>>([]);
  
  const [meals, setMeals] = useState<Meal[]>([]);
  const [newMealName, setNewMealName] = useState('');
  const [newMealTime, setNewMealTime] = useState('08:00');

  const fetchData = () => fetch('/api/physique', { cache: 'no-store' })
    .then(async res => {
      if (!res.ok) throw new Error('Could not load physique data. Please retry.');
      const data = await res.json();
      if (data.metrics) {
        setStartWeight(Number(data.metrics.start_weight) || 40);
        setTargetWeight(Number(data.metrics.target_weight) || 70);
      }
      setWeightLogs(data.weights || []);
      if (data.weights?.length) setCurrentWeight(Number(data.weights[0].weight));
      setMeals((data.checklists || []).filter((c: Meal) => c.type === 'meal'));
    })
    .catch(e => setError(e instanceof Error ? e.message : 'Could not load physique data.'))
    .finally(() => setLoading(false));

  async function updatePhysique(body: object) {
    const response = await fetch('/api/physique', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || 'Could not save changes. Please retry.');
    }
  }

  async function mutate(operation: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setError('');
    try { await operation(); await fetchData(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save changes.'); }
    finally { pending.current = false; setSaving(false); }
  }

  useEffect(() => {
    getLang().then(l => {
      setT(copy[l]);
    });
    fetchData();
  }, []);

  const saveMetrics = () => mutate(async () => {
    await updatePhysique({ type: 'metrics', data: { start_weight: startWeight, target_weight: targetWeight } });
    await updatePhysique({ type: 'weight', action: 'add', data: { weight: currentWeight } });
    setIsEditingWeight(false);
  });

  const addMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMealName.trim()) return;
    void mutate(async () => {
      await updatePhysique({ type: 'checklist', action: 'add', data: { type: 'meal', label: newMealName.trim(), time_target: newMealTime } });
      setNewMealName('');
    });
  };

  const toggleMeal = (id: string, is_completed: boolean) => mutate(() => updatePhysique({ type: 'checklist', action: 'toggle', data: { id, is_completed: !is_completed } }));
  const deleteMeal = (id: string) => mutate(() => updatePhysique({ type: 'checklist', action: 'delete', data: { id } }));

  const chartData = weightLogs.slice().reverse().map(log => ({
    date: new Date(log.recorded_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
    weight: Number(log.weight)
  }));

  if (loading) return <Shell title={t.physiqueTitle} quickFab={false}><ContentSkeleton variant="physique" /></Shell>;

  return (
    <Shell title={t.physiqueTitle} quickFab={false}>
      {error && <p role="alert" className="negative">{error}</p>}
      <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <div className="grid grid2" style={{ marginBottom: '16px' }}>
        <div className="card">
          <div className="row">
            <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Scale size={18} className="card-icon" />
              <span>{t.weightAndTarget.toUpperCase()}</span>
            </div>
            <button className="pill" onClick={() => isEditingWeight ? saveMetrics() : setIsEditingWeight(true)}>
              {isEditingWeight ? <Save size={14} /> : <Edit2 size={14} />} {isEditingWeight ? t.save : t.edit}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))', gap: '8px', marginTop: '12px' }}>
            <div style={{ minWidth: 0 }}>
              <small className="muted">{t.startWeight}</small>
              {isEditingWeight ? (
                <input type="number" className="input" value={startWeight} onChange={e => setStartWeight(parseFloat(e.target.value) || 0)} />
              ) : (
                <div className="big" style={{ fontSize: '22px' }}>{startWeight} kg</div>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <small className="muted">{t.currentWeight}</small>
              {isEditingWeight ? (
                <input type="number" className="input" value={currentWeight} onChange={e => setCurrentWeight(parseFloat(e.target.value) || 0)} />
              ) : (
                <div className="big" style={{ fontSize: '22px', color: 'var(--accent)' }}>{currentWeight} kg</div>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <small className="muted">{t.targetWeight}</small>
              {isEditingWeight ? (
                <input type="number" className="input" value={targetWeight} onChange={e => setTargetWeight(parseFloat(e.target.value) || 0)} />
              ) : (
                <div className="big" style={{ fontSize: '22px', color: 'var(--green)' }}>{targetWeight} kg</div>
              )}
            </div>
          </div>

          {chartData.length > 1 && (
            <div style={{ height: '120px', marginTop: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" stroke="#666" fontSize={10} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="#666" fontSize={10} />
                  <Tooltip labelStyle={{ color: '#000' }} />
                  <Line type="monotone" dataKey="weight" stroke="var(--green)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <div className="row">
            <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Utensils size={18} className="card-icon" />
              <span>{t.mealSchedule.toUpperCase()}</span>
            </div>
          </div>

          <form onSubmit={addMeal} style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <input type="text" className="input" placeholder="08:00" style={{ width: '80px', flex: '0 0 80px' }} value={newMealTime} onChange={e => setNewMealTime(e.target.value)} aria-label="Meal time" />
            <input type="text" className="input" placeholder={t.mealName} value={newMealName} onChange={e => setNewMealName(e.target.value)} style={{ flex: '1 1 160px', minWidth: 0 }} aria-label={t.mealName} />
            <button className="btn" type="submit" aria-label="Add meal"><Plus size={14} /></button>
          </form>

          <div className="list" style={{ marginTop: '12px' }}>
            {meals.map(m => (
              <div key={m.id} className="item">
                <button type="button" onClick={() => toggleMeal(m.id, m.is_completed)} aria-pressed={m.is_completed} aria-label={`${m.is_completed ? 'Undo' : 'Complete'} ${m.label}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1, minWidth: 0, padding: 0, border: 0, background: 'transparent', color: 'inherit', textAlign: 'left' }}>
                  {m.is_completed ? <CheckCircle2 size={18} className="positive" /> : <Circle size={18} className="muted" />}
                  <span style={{ textDecoration: m.is_completed ? 'line-through' : 'none' }}>{m.label} ({m.time_target})</span>
                </button>
                <button onClick={() => deleteMeal(m.id)} className="iconBtn" style={{ color: 'var(--red)', border: 'none', background: 'transparent' }} aria-label={`Delete ${m.label}`}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      </fieldset>
    </Shell>
  );
}
