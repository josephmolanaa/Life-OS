import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const fallbackTodos = [
  { id: 'fallback-1', label: 'Workout pagi (Physic)', done: false, streak: 0 },
  { id: 'fallback-2', label: 'Baca buku 20 mnt (Social/Career)', done: false, streak: 0 },
  { id: 'fallback-3', label: 'Journal / reflection (Discipline)', done: false, streak: 0 },
  { id: 'fallback-4', label: 'Belajar AI 1 jam (Career)', done: false, streak: 0 },
  { id: 'fallback-5', label: 'Push GitHub Streak (Career)', done: false, streak: 0 },
];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(fallbackTodos);

  const { data, error } = await supabase.from('todos').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) return NextResponse.json(fallbackTodos);

  // Rollover at 00:00
  const now = new Date();
  const todayStr = now.toDateString();

  const updatedData = await Promise.all((data || []).map(async (todo) => {
    const updatedAt = new Date(todo.updated_at || todo.created_at || Date.now());
    const todoDayStr = updatedAt.toDateString();

    if (todoDayStr !== todayStr && todo.done) {
      await supabase.from('todos').update({ done: false }).eq('id', todo.id);
      return { ...todo, done: false };
    }
    return todo;
  }));

  return NextResponse.json(updatedData || fallbackTodos);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { label } = await request.json();
  if (!label) return NextResponse.json({ error: 'Label required' }, { status: 400 });

  const { data, error } = await supabase.from('todos').insert({ user_id: user.id, label, done: false }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 200 });
  return NextResponse.json(data, { status: 201 });
}
