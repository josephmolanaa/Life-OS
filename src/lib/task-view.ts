type Task = { label: string; done: boolean; priority?: 'LOW' | 'MEDIUM' | 'HIGH' };

export function filterTasks<T extends Task>(tasks: T[], filter: 'all' | 'active' | 'completed', search: string): T[] {
  const query = search.trim().toLocaleLowerCase();
  const priority = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return tasks.filter(task =>
    (filter === 'all' || task.done === (filter === 'completed')) &&
    task.label.toLocaleLowerCase().includes(query)
  ).sort((a, b) => Number(a.done) - Number(b.done) || priority[a.priority || 'MEDIUM'] - priority[b.priority || 'MEDIUM']);
}
