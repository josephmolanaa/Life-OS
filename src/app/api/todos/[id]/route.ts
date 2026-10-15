import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  const payload = body as { done?: unknown; label?: unknown; priority?: unknown };
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: 'Invalid todo ID' }, { status: 400 });
  
  const updateData: { done?: boolean; label?: string; priority?: 'LOW'|'MEDIUM'|'HIGH' } = {};
  if (payload.done !== undefined) {
    if (typeof payload.done !== 'boolean') return NextResponse.json({ error: 'done must be boolean' }, { status: 400 });
    updateData.done = payload.done;
  }
  if (payload.label !== undefined) {
    if (typeof payload.label !== 'string' || !payload.label.trim() || payload.label.trim().length > 120) return NextResponse.json({ error: 'Label must be 1–120 characters' }, { status: 400 });
    updateData.label = payload.label.trim();
  }
  if (payload.priority !== undefined) {
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(payload.priority as string)) return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
    updateData.priority = payload.priority as 'LOW'|'MEDIUM'|'HIGH';
  }
  if (!Object.keys(updateData).length) return NextResponse.json({ error: 'No changes supplied' }, { status: 400 });

  const { data, error } = await supabase
    .from('todos')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error?.code === '23505') return NextResponse.json({ error: 'A todo with this label already exists' }, { status: 409 });
  if (error?.code === 'PGRST116') return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: 'Invalid todo ID' }, { status: 400 });
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
