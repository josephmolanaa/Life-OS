'use client';

import { useState, useEffect } from 'react';
import { Shell } from '@/components/finance/layout';
import { getLang, copy, type Lang, type Translation } from '@/lib/i18n';
import { Scale, Dumbbell, Utensils, CheckCircle2, Circle, Edit2, Save, Plus, Trash2, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function PhysiquePage() {
  const [lang, setLang] = useState<Lang>('en');
  const [t, setT] = useState<Translation>(copy.en);

  const [startWeight, setStartWeight] = useState<number>(40);
  const [currentWeight, setCurrentWeight] = useState<number>(45);
  const [targetWeight, setTargetWeight] = useState<number>(70);
  const [isEditingWeight, setIsEditingWeight] = useState(false);
  const [weightLogs, setWeightLogs] = useState<Array<{ id: string; weight: number; recorded_at: string }>>([]);
  
  const [meals, setMeals] = useState<any[]>([]);
  const [newMealName, setNewMealName] = useState('');
  const [newMealTime, setNewMealTime] = useState('08:00');

  const fetchData = async () => {
    try {
      const res = await fetch('/api/physique', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.metrics) {
          setStartWeight(Number(data.metrics.start_weight) || 40);
          setTargetWeight(Number(data.metrics.target_weight) || 70);
        }
        if (data.weights && data.weights.length > 0) {
          setWeightLogs(data.weights);
          setCurrentWeight(Number(data.weights[0].weight));
        }
        if (data.checklists) {
          setMeals(data.checklists.filter((c: any) => c.type === 'meal'));
        }
      }
    } catch (e) {
      console.error('Fetch error:', e);
    }
  };

  useEffect(() => {
    getLang().then(l => {
      setLang(l);
      setT(copy[l]);
    });
    fetchData();
  }, []);

  const saveMetrics = async () => {
    setIsEditingWeight(false);
    await fetch('/api/physique', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'metrics',
        data: { start_weight: startWeight, target_weight: targetWeight }
      })
    });

    await fetch('/api/physique', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'weight',
        action: 'add',
        data: { weight: currentWeight }
      })
    });
    fetchData();
  };

  const addMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMealName.trim()) return;

    await fetch('/api/physique', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'checklist',
        action: 'add',
        data: { type: 'meal', label: newMealName, time_target: newMealTime }
      })
    });
    setNewMealName('');
    fetchData();
  };

  const toggleMeal = async (id: string, is_completed: boolean) => {
    setMeals(meals.map(m => m.id === id ? { ...m, is_completed: !is_completed } : m));
    await fetch('/api/physique', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'checklist',
        action: 'toggle',
        data: { id, is_completed: !is_completed }
      })
    });
  };

  const deleteMeal = async (id: string) => {
    setMeals(meals.filter(m => m.id !== id));
    await fetch('/api/physique', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'checklist',
        action: 'delete',
        data: { id }
      })
    });
    fetchData();
  };

  const totalDiff = targetWeight - startWeight;
  const currentDiff = currentWeight - startWeight;
  let progressPercent = 0;
  if (totalDiff !== 0) {
    progressPercent = Math.min(100, Math.max(0, (currentDiff / totalDiff) * 100));
  }

  const chartData = weightLogs.slice().reverse().map(log => ({
    date: new Date(log.recorded_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
    weight: Number(log.weight)
  }));

  return (
    <Shell title={t.physiqueTitle} quickFab={false}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '12px' }}>
            <div>
              <small className="muted">{t.startWeight}</small>
              {isEditingWeight ? (
                <input type="number" className="input" value={startWeight} onChange={e => setStartWeight(parseFloat(e.target.value) || 0)} />
              ) : (
                <div className="big" style={{ fontSize: '22px' }}>{startWeight} kg</div>
              )}
            </div>
            <div>
              <small className="muted">{t.currentWeight}</small>
              {isEditingWeight ? (
                <input type="number" className="input" value={currentWeight} onChange={e => setCurrentWeight(parseFloat(e.target.value) || 0)} />
              ) : (
                <div className="big" style={{ fontSize: '22px', color: 'var(--accent)' }}>{currentWeight} kg</div>
              )}
            </div>
            <div>
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

          <form onSubmit={addMeal} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <input type="text" className="input" placeholder="08:00" style={{ width: '80px' }} value={newMealTime} onChange={e => setNewMealTime(e.target.value)} />
            <input type="text" className="input" placeholder={t.mealName} value={newMealName} onChange={e => setNewMealName(e.target.value)} />
            <button className="btn" type="submit"><Plus size={14} /></button>
          </form>

          <div className="list" style={{ marginTop: '12px' }}>
            {meals.map(m => (
              <div key={m.id} className="item">
                <div onClick={() => toggleMeal(m.id, m.is_completed)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
                  {m.is_completed ? <CheckCircle2 size={18} className="positive" /> : <Circle size={18} className="muted" />}
                  <span style={{ textDecoration: m.is_completed ? 'line-through' : 'none' }}>{m.label} ({m.time_target})</span>
                </div>
                <button onClick={() => deleteMeal(m.id)} className="iconBtn" style={{ color: 'var(--red)', border: 'none', background: 'transparent' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
