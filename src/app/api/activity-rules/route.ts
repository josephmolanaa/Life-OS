import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([]);

  const { data, error } = await supabase
    .from('activity_app_rules')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json([]);
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { match_type, match_value, display_name, category } = await request.json();
  if (!match_type || !match_value || !display_name || !category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Use upsert so quick assign overwrites on same app/value to prevent unique constraint error
  const { data, error } = await supabase
    .from('activity_app_rules')
    .upsert({ user_id: user.id, match_type, match_value, display_name, category }, { onConflict: 'user_id,match_type,match_value' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 200 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, match_type, match_value, display_name, category, is_active } = await request.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const payload: Record<string, unknown> = {};
  if (match_type !== undefined) payload.match_type = match_type;
  if (match_value !== undefined) payload.match_value = match_value;
  if (display_name !== undefined) payload.display_name = display_name;
  if (category !== undefined) payload.category = category;
  if (is_active !== undefined) payload.is_active = is_active;

  const { data, error } = await supabase
    .from('activity_app_rules')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 200 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase
    .from('activity_app_rules')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 200 });
  return NextResponse.json({ success: true });
}
