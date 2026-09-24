import { useState } from 'react';
import { Trophy, Trash2, Plus, Pencil, Check, X } from 'lucide-react';

type TodoItem = {
  id: string;
  label: string;
  done: boolean;
  streak: number;
};

type Props = {
  todos: TodoItem[];
  onToggle: (id: string, checked: boolean) => void;
  onAdd?: (label: string) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, label: string) => void;
};

export function DailyQuestCard({ todos, onToggle, onAdd, onDelete, onUpdate }: Props) {
  const [newHabit, setNewHabit] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabit.trim() || !onAdd) return;
    onAdd(newHabit.trim());
    setNewHabit('');
  };

  const startEdit = (todo: TodoItem) => {
    setEditingId(todo.id);
    setEditLabel(todo.label);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
  };

  const saveEdit = (id: string) => {
    if (!editLabel.trim() || !onUpdate) return;
    onUpdate(id, editLabel.trim());
    setEditingId(null);
  };

  return (
    <section className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Daily Quest</h2>
          <p className="muted" style={{ margin: '2px 0 0', fontSize: '12px' }}>Real-life habit tracker</p>
        </div>
        <Trophy size={18} className="muted" />
      </div>

      <div className="list" style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
        {todos.map((todo) => {
          const isEditing = editingId === todo.id;
          return (
            <div key={todo.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', background: 'var(--surface2)', border: '1px solid var(--border2)' }}>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={(event) => onToggle(todo.id, event.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--green)', flexShrink: 0 }}
              />
              
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                {isEditing ? (
                  <input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(todo.id);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    autoFocus
                    style={{ flex: 1, fontSize: '14px', padding: '2px 4px', background: 'var(--card-bg)', color: 'var(--text)', border: '1px solid var(--accent)', borderRadius: '4px' }}
                  />
                ) : (
                  <span style={{ textDecoration: todo.done ? 'line-through' : 'none', color: todo.done ? 'var(--text3)' : 'var(--text)', fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {todo.label}
                  </span>
                )}
                
                {!isEditing && (
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: todo.done ? 'rgba(76, 175, 80, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: todo.done ? 'var(--green)' : '#f59e0b', letterSpacing: '0.5px', textTransform: 'uppercase', flexShrink: 0 }}>
                    🔥 {todo.streak}d streak
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                {isEditing ? (
                  <>
                    <button onClick={() => saveEdit(todo.id)} style={{ background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer', padding: '4px' }}><Check size={15} /></button>
                    <button onClick={cancelEdit} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '4px' }}><X size={15} /></button>
                  </>
                ) : (
                  <>
                    {onUpdate && (
                      <button onClick={() => startEdit(todo)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '4px' }} title="Edit habit"><Pencil size={15} /></button>
                    )}
                    {onDelete && (
                      <button onClick={() => onDelete(todo.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '4px' }} title="Delete habit"><Trash2 size={15} /></button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
        {todos.length === 0 && (
          <p className="muted" style={{ fontSize: '14px', textAlign: 'center', padding: '12px 0' }}>No habits yet.</p>
        )}
      </div>

      {onAdd && (
        <form 
          onSubmit={handleAdd} 
          style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginTop: 'auto', flexWrap: 'wrap' }}
        >
          <input
            type="text"
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            placeholder="New habit..."
            style={{ width: '180px', fontSize: '13px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)' }}
          />
          <button
            type="submit"
            disabled={!newHabit.trim()}
            style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '6px', background: 'var(--green)', color: '#000', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', opacity: newHabit.trim() ? 1 : 0.5 }}
          >
            <Plus size={14} /> Add
          </button>
        </form>
      )}
    </section>
  );
}
