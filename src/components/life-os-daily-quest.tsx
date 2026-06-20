import { Trophy } from 'lucide-react';

type TodoItem = {
  id: string;
  label: string;
  done: boolean;
  streak: number;
};

export function DailyQuestCard({ todos, onToggle }: { todos: TodoItem[]; onToggle: (id: string, checked: boolean) => void }) {
  return (
    <section className="card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Daily Quest</h2>
          <p className="muted" style={{ margin: '2px 0 0', fontSize: '12px' }}>Real-life habit tracker</p>
        </div>
        <Trophy size={18} className="muted" />
      </div>
      <div className="list" style={{ display: 'grid', gap: '4px' }}>
        {todos.map((todo) => (
          <label key={todo.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border2)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={(event) => onToggle(todo.id, event.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--green)', flexShrink: 0, marginTop: '2px' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ textDecoration: todo.done ? 'line-through' : 'none', color: todo.done ? 'var(--text3)' : 'var(--text)', fontSize: '14px', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {todo.label}
              </span>
              <span className="muted" style={{ fontSize: '11px', display: 'block', marginTop: '4px' }}>Streak {todo.streak} hari</span>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}
