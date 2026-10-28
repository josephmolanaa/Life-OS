import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > 8_192) return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    const raw = await request.text();
    if (raw.length > 8_192) return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
    const payload = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null;
    const userId = payload && typeof payload.userId === 'string' ? payload.userId.trim() : '';

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Update user metadata to remove avatar_url
    const { error } = await supabase.auth.updateUser({ data: { avatar_url: null } });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Avatar cleared' });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
