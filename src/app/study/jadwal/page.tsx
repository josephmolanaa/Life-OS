'use client';

import { useEffect, useState } from 'react';
import { Shell } from '@/components/finance/layout';
import { getLang } from '@/lib/i18n';
import { defaultStudySchedule } from '@/lib/study';

type StudyItem = {
  id?: string;
  code: string;
  course: string;
  day: string;
  sessions?: string | null;
  time?: string | null;
  room?: string | null;
  lecturer?: string | null;
  semester?: string | null;
};

const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU', '-'];
const FIELDS = ['code', 'course', 'day', 'sessions', 'time', 'room', 'lecturer', 'semester'] as const;
const empty: StudyItem = { code: '', course: '', day: 'SENIN', sessions: '', time: '', room: '', lecturer: '', semester: 'Semester 7' };
const dayOrder = (d: string) => { const i = DAYS.indexOf(d.toUpperCase()); return i < 0 ? 99 : i; };

export default function JadwalPage() {
  const [id, setId] = useState(false);
  const [items, setItems] = useState<StudyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<StudyItem | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { getLang().then(l => setId(l === 'id')); load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/study/schedule', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load schedule');
      setItems(data); setError('');
    } catch (err) { setError((err as Error).message); }
    setLoading(false);
  }

  async function send(method: string, body?: object, itemId?: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/study/schedule${itemId ? `?id=${encodeURIComponent(itemId)}` : ''}`, {
        method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      await load(); return true;
    } catch (err) { setError((err as Error).message); return false; }
    finally { setBusy(false); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const body = Object.fromEntries(FIELDS.map(f => [f, form[f] ?? '']));
    if (await send(form.id ? 'PATCH' : 'POST', body, form.id)) setForm(null);
  }

  async function remove(item: StudyItem) {
    if (!item.id || !confirm(id ? `Hapus ${item.course}?` : `Delete ${item.course}?`)) return;
    await send('DELETE', undefined, item.id);
  }

  async function importDefaults() {
    for (const item of defaultStudySchedule) if (!(await send('POST', item))) break;
  }

  const sorted = [...items].sort((a, b) => dayOrder(a.day) - dayOrder(b.day) || String(a.time).localeCompare(String(b.time)));
  const semester = items[0]?.semester || 'Semester 7';
  const unset = id ? 'Belum ditentukan' : 'Not specified';
  const show = (v?: string | null) => (!v || v === '-' ? unset : v);
  const label: Record<(typeof FIELDS)[number], string> = id
    ? { code: 'Kode', course: 'Mata kuliah', day: 'Hari', sessions: 'Jam ke', time: 'Waktu', room: 'Ruang', lecturer: 'Dosen', semester: 'Semester' }
    : { code: 'Code', course: 'Course', day: 'Day', sessions: 'Sessions', time: 'Time', room: 'Room', lecturer: 'Lecturer', semester: 'Semester' };

  return (
    <Shell title={id ? 'Jadwal Kuliah' : 'Class Schedule'} quickFab={false}>
      <div style={{ display: 'grid', gap: 20, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{semester}</h2>
          <button className="btn" type="button" onClick={() => setForm({ ...empty, semester })} disabled={busy}>{id ? 'Tambah mata kuliah' : 'Add course'}</button>
        </div>

        {error && <div className="card" role="alert" style={{ padding: 16, color: 'var(--red)' }}>{error}</div>}

        {form && (
          <form className="card" onSubmit={save} style={{ padding: 20, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))' }}>
            {FIELDS.map(f => (
              <label key={f} style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                {label[f]}
                {f === 'day'
                  ? <select value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}>{DAYS.map(d => <option key={d}>{d}</option>)}</select>
                  : <input value={form[f] ?? ''} required={f === 'code' || f === 'course'} maxLength={f === 'code' ? 20 : 120} onChange={e => setForm({ ...form, [f]: e.target.value })} />}
              </label>
            ))}
            <div style={{ display: 'flex', gap: 8, alignItems: 'end', gridColumn: '1 / -1' }}>
              <button className="btn" type="submit" disabled={busy}>{id ? 'Simpan' : 'Save'}</button>
              <button type="button" onClick={() => setForm(null)} disabled={busy}>{id ? 'Batal' : 'Cancel'}</button>
            </div>
          </form>
        )}

        {loading ? <p style={{ color: 'var(--text2)' }}>{id ? 'Memuat…' : 'Loading…'}</p>
          : !sorted.length ? (
            <div className="card" style={{ padding: 20, display: 'grid', gap: 12, justifyItems: 'start' }}>
              <p style={{ margin: 0 }}>{id ? 'Belum ada jadwal. Tambah mata kuliah atau impor jadwal Semester 7.' : 'No classes yet. Add a course or import the Semester 7 schedule.'}</p>
              <button type="button" onClick={importDefaults} disabled={busy}>{id ? 'Impor jadwal Semester 7' : 'Import Semester 7 schedule'}</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))' }}>
              {sorted.map(item => (
                <article className="card" key={item.id ?? item.code} style={{ padding: 16, display: 'grid', gap: 10, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <span className="pill">{item.day}</span>
                    <small style={{ color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>{item.code}</small>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 16, overflowWrap: 'anywhere' }}>{item.course}</h3>
                  <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: 13 }}>
                    <dt style={{ color: 'var(--text2)' }}>{label.time}</dt><dd style={{ margin: 0 }}>{show(item.time)}{item.sessions && item.sessions !== '-' ? ` (${label.sessions} ${item.sessions})` : ''}</dd>
                    <dt style={{ color: 'var(--text2)' }}>{label.room}</dt><dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{show(item.room)}</dd>
                    <dt style={{ color: 'var(--text2)' }}>{label.lecturer}</dt><dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{show(item.lecturer)}</dd>
                  </dl>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => setForm({ ...item })} disabled={busy}>{id ? 'Edit' : 'Edit'}</button>
                    <button type="button" onClick={() => remove(item)} disabled={busy}>{id ? 'Hapus' : 'Delete'}</button>
                  </div>
                </article>
              ))}
            </div>
          )}
      </div>
    </Shell>
  );
}
