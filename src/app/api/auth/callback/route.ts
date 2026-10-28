import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const requestedNext = searchParams.get('next');
  let next = '/finance';
  if (requestedNext && requestedNext.startsWith('/') && !requestedNext.startsWith('//') && !requestedNext.includes('\\')) {
    try {
      const target = new URL(requestedNext, origin);
      if (target.origin === origin) next = `${target.pathname}${target.search}${target.hash}`;
    } catch {}
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL('/login?error=Authentication%20callback%20failed', origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
