import { notFound } from 'next/navigation';
import TodoistWorkspace from '@/components/todoist-workspace';
export default async function TaskPage({ params }: { params: Promise<{ view: string }> }) {
  const { view } = await params;
  if (view !== 'inbox' && view !== 'today' && view !== 'upcoming') notFound();
  return <TodoistWorkspace key={view} view={view} />;
}
