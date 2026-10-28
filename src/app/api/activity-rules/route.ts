import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('activity_app_rules')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Unable to load activity rules' }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  const { match_type, match_value, display_name, category } = body;
  if (!['app', 'title'].includes(String(match_type)) || typeof match_value !== 'string' || !match_value.trim() || match_value.length > 200 || typeof display_name !== 'string' || !display_name.trim() || display_name.length > 100 || !['work', 'play', 'learn', 'admin', 'social', 'health', 'uncategorized'].includes(String(category))) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Use upsert so quick assign overwrites on same app/value to prevent unique constraint error
  const { data, error } = await supabase
    .from('activity_app_rules')
    .upsert({ user_id: user.id, match_type, match_value, display_name, category }, { onConflict: 'user_id,match_type,match_value' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Unable to save activity rule' }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  const { id, match_type, match_value, display_name, category, is_active } = body;
  if (typeof id !== 'string' || !id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  if (match_type !== undefined && !['app', 'title'].includes(String(match_type))) return NextResponse.json({ error: 'Invalid match_type' }, { status: 400 });
  if (match_value !== undefined && (typeof match_value !== 'string' || !match_value.trim() || match_value.length > 200)) return NextResponse.json({ error: 'Invalid match_value' }, { status: 400 });
  if (display_name !== undefined && (typeof display_name !== 'string' || !display_name.trim() || display_name.length > 100)) return NextResponse.json({ error: 'Invalid display_name' }, { status: 400 });
  if (category !== undefined && !['work', 'play', 'learn', 'admin', 'social', 'health', 'uncategorized'].includes(String(category))) return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  if (is_active !== undefined && typeof is_active !== 'boolean') return NextResponse.json({ error: 'Invalid is_active' }, { status: 400 });

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

  if (error) return NextResponse.json({ error: 'Unable to update activity rule' }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  const { id } = body;
  if (typeof id !== 'string' || !id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase
    .from('activity_app_rules')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: 'Unable to delete activity rule' }, { status: 500 });
  return NextResponse.json({ success: true });
}
