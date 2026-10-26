import { useState } from 'react';
import { Trophy, Trash2, Plus, Pencil, Check, X } from 'lucide-react';
import type { DailyQuest } from './use-daily-quests';
import type { Lang } from '@/lib/i18n';

type Props = {
  todos: DailyQuest[];
  onToggle: (id: string, checked: boolean) => Promise<boolean>;
  onAdd?: (label: string) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
  onUpdate?: (id: string, label: string) => Promise<boolean>;
  busy?: boolean;
  error?: string;
  lang?: Lang;
};

export function DailyQuestCard({ todos, onToggle, onAdd, onDelete, onUpdate, busy, error, lang = 'en' }: Props) {
  const [newHabit, setNewHabit] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const id = lang === 'id';
  const disabled = busy || isAdding;
  const cancelEdit = () => { setEditingId(null); setEditLabel(''); };
  const saveEdit = async (todoId: string) => {
    if (disabled || !editLabel.trim() || !onUpdate) return;
    if (await onUpdate(todoId, editLabel.trim())) cancelEdit();
  };

  return <section className="card dailyQuestCard" aria-busy={disabled}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18 }}>{id ? 'Kebiasaan hari ini' : 'Today’s habits'}</h2>
        <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>{todos.filter(todo => todo.done).length}/{todos.length} {id ? 'selesai hari ini' : 'completed today'}</p>
      </div>
      <Trophy size={18} className="muted" aria-hidden="true" />
    </div>
    {error && <p role="alert" style={{ color: 'var(--red)' }}>{error}</p>}
    <div className="list" style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
      {todos.map(todo => <div key={todo.id} className="dailyQuestItem">
        <input type="checkbox" disabled={disabled} checked={todo.done} aria-label={`${id ? (todo.done ? 'Batalkan selesai' : 'Selesaikan') : (todo.done ? 'Mark incomplete' : 'Complete')} ${todo.label}`} onChange={event => void onToggle(todo.id, event.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--green)', flexShrink: 0 }} />
        <div className="dailyQuestContent">
          {editingId === todo.id ? <input className="input" aria-label={`${id ? 'Ubah' : 'Edit'} ${todo.label}`} value={editLabel} maxLength={120} disabled={disabled} onChange={event => setEditLabel(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void saveEdit(todo.id); if (event.key === 'Escape' && !disabled) cancelEdit(); }} autoFocus />
            : <span style={{ overflowWrap: 'anywhere', textDecoration: todo.done ? 'line-through' : 'none', fontSize: 14 }}>{todo.label}</span>}
        </div>
        <div style={{ display: 'flex', flexShrink: 0 }}>
          {editingId === todo.id ? <>
            <button type="button" className="btn" disabled={disabled || !editLabel.trim()} aria-label={`${id ? 'Simpan' : 'Save'} ${todo.label}`} onClick={() => void saveEdit(todo.id)}><Check size={16} /></button>
            <button type="button" className="btn" disabled={disabled} aria-label={`${id ? 'Batal mengubah' : 'Cancel editing'} ${todo.label}`} onClick={cancelEdit}><X size={16} /></button>
          </> : <>
            {onUpdate && <button type="button" className="btn" disabled={disabled} aria-label={`${id ? 'Ubah' : 'Edit'} ${todo.label}`} onClick={() => { setEditingId(todo.id); setEditLabel(todo.label); }}><Pencil size={16} /></button>}
            {onDelete && <button type="button" className="btn" disabled={disabled} aria-label={`${id ? 'Hapus' : 'Delete'} ${todo.label}`} onClick={() => void onDelete(todo.id)}><Trash2 size={16} /></button>}
          </>}
        </div>
      </div>)}
      {!todos.length && <p className="muted">{id ? 'Belum ada kebiasaan. Tambahkan satu di bawah.' : 'No habits yet. Add your first below.'}</p>}
    </div>
    {onAdd && <form className="dailyQuestForm" onSubmit={async event => {
      event.preventDefault();
      if (disabled || !newHabit.trim()) return;
      setIsAdding(true);
      try { if (await onAdd(newHabit.trim())) setNewHabit(''); }
      finally { setIsAdding(false); }
    }}>
      <input className="input dailyQuestInput" aria-label={id ? 'Kebiasaan baru' : 'New daily quest'} placeholder={id ? 'Kebiasaan baru…' : 'New habit…'} maxLength={120} required disabled={disabled} value={newHabit} onChange={event => setNewHabit(event.target.value)} />
      <button type="submit" className="btn" disabled={!newHabit.trim() || disabled}><Plus size={14} aria-hidden="true" />{id ? 'Tambah' : 'Add'}</button>
    </form>}
  </section>;
}
