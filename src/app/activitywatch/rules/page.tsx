"use client";

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Shell } from '@/components/finance/layout';
import type { ActivityRule } from '@/lib/activitywatch-types';

const categoryOptions = ['work', 'play', 'learn', 'admin', 'social', 'health', 'uncategorized'] as const;
const emptyForm = { match_type: 'app' as 'app' | 'title', match_value: '', display_name: '', category: 'work' };

export default function ActivityRulesPage() {
  const [rules, setRules] = useState<ActivityRule[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/activity-rules').then(async (response) => {
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) throw new Error('Unable to load activity rules. Please refresh to retry.');
      setRules(data);
    }).catch(() => setError('Unable to load activity rules. Please refresh to retry.'));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { id: editingId, ...form } : form;
      const response = await fetch('/api/activity-rules', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const rule = await response.json();
      if (!response.ok || !rule?.id) throw new Error('Unable to save activity rule');
      setRules((current) => current.some((item) => item.id === rule.id) ? current.map((item) => item.id === rule.id ? rule : item) : [rule, ...current]);
      setForm(emptyForm);
      setEditingId(null);
    } catch {
      setError('Unable to save activity rule. Your changes are still in the form.');
    } finally { setBusy(false); }
  };

  const startEdit = (rule: ActivityRule) => {
    setEditingId(rule.id);
    setForm({ match_type: rule.match_type, match_value: rule.match_value, display_name: rule.display_name, category: rule.category });
  };

  const remove = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/activity-rules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error('Unable to delete activity rule');
      setRules((current) => current.filter((rule) => rule.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm);
      }
    } catch { setError('Unable to delete activity rule. Please try again.'); }
    finally { setBusy(false); }
  };

  return (
    <Shell title="Activity Rules" quickFab={false}>
      <div style={{ display: 'grid', gap: '20px' }}>
        {error && <p role="alert">{error}</p>}
        <header className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="muted" style={{ letterSpacing: '.32em', fontSize: '11px', textTransform: 'uppercase', margin: 0 }}>ActivityWatch</p>
              <h1 className="big" style={{ margin: '8px 0 6px', fontSize: '28px' }}>Rules Mapping</h1>
            </div>
            <Link className="btn ghost" href="/activitywatch" style={{ gap: '6px' }}><ArrowLeft size={16} /> Back</Link>
          </div>
          <p className="muted" style={{ margin: 0 }}>Rename app dan override category tanpa ubah data mentah ActivityWatch.</p>
        </header>

        <form className="card" onSubmit={submit} style={{ padding: '20px', display: 'grid', gap: '12px' }}>
          <select className="input" value={form.match_type} onChange={(event) => setForm({ ...form, match_type: event.target.value as 'app' | 'title' })}>
            <option value="app">Match app</option>
            <option value="title">Match title</option>
          </select>
          <input className="input" placeholder="Roblox" value={form.match_value} onChange={(event) => setForm({ ...form, match_value: event.target.value })} />
          <input className="input" placeholder="Roblox Studio" value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} />
          <input className="input" placeholder="Category (e.g. game, work, play)" list="categories-list" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
          <datalist id="categories-list">
            {categoryOptions.map((category) => <option key={category} value={category} />)}
          </datalist>
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button className="btn" type="submit" disabled={busy}>{editingId ? 'Update rule' : 'Add rule'}</button>
            {editingId && <button className="btn ghost" type="button" disabled={busy} onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel edit</button>}
          </div>
        </form>

        <section className="grid" style={{ gap: '10px' }}>
          {rules.map((rule) => (
            <article key={rule.id} className="card" style={{ padding: '16px' }}>
              <div className="row">
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{rule.display_name}</h2>
                  <p className="muted" style={{ fontSize: '12px', margin: '4px 0 0' }}>{rule.match_type}: {rule.match_value} ? {rule.category}</p>
                </div>
                <div className="row">
                  <button className="btn ghost" type="button" disabled={busy} onClick={() => startEdit(rule)}>Edit</button>
                  <button className="btn ghost" type="button" disabled={busy} onClick={() => remove(rule.id)}>Delete</button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </Shell>
  );
}
