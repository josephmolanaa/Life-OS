import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 16_384) return NextResponse.json({ error: 'Request terlalu besar.' }, { status: 413 });
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 16_384) return NextResponse.json({ error: 'Request terlalu besar.' }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    body = null;
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Payload tidak valid.' }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';
  const response = NextResponse.json({ ok: true });

  if (!email || !password) {
    return NextResponse.json({ error: 'Email dan password wajib diisi.' }, { status: 400 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.headers.get('cookie')
            ?.split('; ')
            .filter(Boolean)
            .map((entry) => {
              const separator = entry.indexOf('=');
              return { name: entry.slice(0, separator), value: entry.slice(separator + 1) };
            }) ?? [];
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  let signedInResolve: () => void = () => {};
  const signedIn = new Promise<void>((resolve) => { signedInResolve = resolve; });
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') {
      setTimeout(() => {
        subscription.unsubscribe();
        signedInResolve();
      }, 0);
    }
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    subscription.unsubscribe();
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  await Promise.race([
    signedIn,
    new Promise<void>((resolve) => setTimeout(resolve, 500)),
  ]);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
