import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const kind = new URL(request.url).searchParams.get('kind') || 'daily';
  if (!['daily', 'task'].includes(kind)) return NextResponse.json({ error: 'Invalid list kind' }, { status: 400 });
  const { data, error } = await supabase.from('todos').select('*').eq('user_id', user.id).eq('list_kind', kind).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (kind === 'task') return NextResponse.json(data);

  // Rollover at 00:00
  const now = new Date();
  const todayStr = now.toDateString();

  const updatedData = await Promise.all((data || []).map(async (todo) => {
    const updatedAt = new Date(todo.updated_at || todo.created_at || Date.now());
    const todoDayStr = updatedAt.toDateString();

    if (todoDayStr !== todayStr && todo.done) {
      const { error: updateError } = await supabase.from('todos').update({ done: false }).eq('id', todo.id).eq('user_id', user.id);
      if (updateError) throw updateError;
      return { ...todo, done: false };
    }
    return todo;
  })).catch(() => null);
  if (!updatedData) return NextResponse.json({ error: 'Unable to reset daily quests' }, { status: 500 });

  return NextResponse.json(updatedData);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  const { label, priority, list_kind = 'daily', done = false } = body as { label?: unknown; priority?: unknown; list_kind?: unknown; done?: unknown };
  if (!['daily', 'task'].includes(list_kind as string) || typeof done !== 'boolean') return NextResponse.json({ error: 'Invalid todo' }, { status: 400 });
  if (typeof label !== 'string' || !label.trim() || label.trim().length > 120) return NextResponse.json({ error: 'Label must be 1–120 characters' }, { status: 400 });
  if (priority !== undefined && !['LOW', 'MEDIUM', 'HIGH'].includes(priority as string)) return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });

  const { data, error } = await supabase.from('todos').insert({ user_id: user.id, label: label.trim(), done, list_kind, priority: priority ?? 'MEDIUM' }).select().single();
  if (error?.code === '23505') return NextResponse.json({ error: 'A todo with this label already exists' }, { status: 409 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
