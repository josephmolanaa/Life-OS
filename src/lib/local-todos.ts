export type LocalTodoRecord = {
  id: string;
  label: string;
  done: boolean;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
};

export function todoStorageKey(userId: string | null) {
  return `editable-todos:${userId || 'anonymous'}`;
}

export function parseLocalTodos(value: string | null): LocalTodoRecord[] {
  try {
    const parsed: unknown = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is LocalTodoRecord => !!item && typeof item.id === 'string' && typeof item.label === 'string' && typeof item.done === 'boolean' && (item.priority === undefined || ['LOW', 'MEDIUM', 'HIGH'].includes(item.priority))) : [];
  } catch { return []; }
}
