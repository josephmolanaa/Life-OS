import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasActivityPermission, setActivityPermission, trustedActivityRequest } from '@/lib/activitywatch-permissions';

export const runtime = 'nodejs';

async function permission(request: Request, change: boolean) {
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!trustedActivityRequest(request)) return NextResponse.json({ error: 'Desktop access required' }, { status: 403, headers });
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: 'Sign in required' }, { status: 401, headers });
    if (change) {
      const body = await request.json().catch(() => null);
      if (!body || typeof body.allowed !== 'boolean') return NextResponse.json({ error: 'Invalid permission' }, { status: 400, headers });
      setActivityPermission(user.id, body.allowed);
    }
    return NextResponse.json({ allowed: hasActivityPermission(user.id) }, { headers });
  } catch {
    return NextResponse.json({ error: 'Permission could not be loaded or saved' }, { status: 503, headers });
  }
}

export function GET(request: Request) { return permission(request, false); }
export function POST(request: Request) { return permission(request, true); }
