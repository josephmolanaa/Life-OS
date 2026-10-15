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
  onAdd?: (label: string) => Promise<boolean>;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, label: string) => void;
  error?: string;
};

export function DailyQuestCard({ todos, onToggle, onAdd, onDelete, onUpdate, error }: Props) {
  const [newHabit, setNewHabit] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newHabit.trim() || !onAdd || isAdding) return;
    setIsAdding(true);
    try {
      if (await onAdd(newHabit.trim())) setNewHabit('');
    } finally {
      setIsAdding(false);
    }
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
    <section className="card dailyQuestCard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Daily Quest</h2>
          <p className="muted" style={{ margin: '2px 0 0', fontSize: '12px' }}>Real-life habit tracker</p>
        </div>
        <Trophy size={18} className="muted" />
      </div>

      <div className="list" style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
        {error && <p role="alert" aria-live="assertive" style={{ margin: 0, color: 'var(--red)', fontSize: '13px' }}>{error}</p>}
        {todos.map((todo) => {
          const isEditing = editingId === todo.id;
          return (
            <div key={todo.id} className="dailyQuestItem">
              <input
                type="checkbox"
                aria-label={`${todo.done ? 'Mark incomplete' : 'Complete'} ${todo.label}`}
                checked={todo.done}
                onChange={(event) => onToggle(todo.id, event.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--green)', flexShrink: 0 }}
              />
              
              <div className="dailyQuestContent">
                {isEditing ? (
                  <input
                    aria-label={`Edit ${todo.label}`}
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
                    <button aria-label={`Save ${todo.label}`} onClick={() => saveEdit(todo.id)} style={{ background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer', padding: '4px' }}><Check size={15} /></button>
                    <button aria-label={`Cancel editing ${todo.label}`} onClick={cancelEdit} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '4px' }}><X size={15} /></button>
                  </>
                ) : (
                  <>
                    {onUpdate && (
                      <button aria-label={`Edit ${todo.label}`} onClick={() => startEdit(todo)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '6px' }} title="Edit habit"><Pencil size={15} /></button>
                    )}
                    {onDelete && (
                      <button aria-label={`Delete ${todo.label}`} onClick={() => onDelete(todo.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '6px' }} title="Delete habit"><Trash2 size={15} /></button>
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
        <form className="dailyQuestForm"
          onSubmit={handleAdd} 
        >
          <input
            type="text"
            aria-label="New daily quest"
            maxLength={120}
            disabled={isAdding}
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            placeholder="New habit..."
            className="input dailyQuestInput"
          />
          <button
            type="submit"
            className="btn"
            disabled={!newHabit.trim() || isAdding}
          >
            <Plus size={14} aria-hidden="true" /> Add
          </button>
        </form>
      )}
    </section>
  );
}
