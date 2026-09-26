import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { userCanAccessAdminPanel } from '@/lib/auth/adminAccess';
import { isProtectedAppPath } from '@/lib/auth/protectedRoutes';

function applySecurityHeaders(res: NextResponse, nonce: string) {
  const isDev = process.env.NODE_ENV !== 'production';
  const scriptSrc = [
    `'self'`,
    `'nonce-${nonce}'`,
    `'strict-dynamic'`,
    'https:',
    ...(isDev ? [`'unsafe-eval'`] : []),
  ].join(' ');

  const csp = [
    `default-src 'self'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `media-src 'self' blob: data: https:`,
    `font-src 'self' https: data:`,
    `connect-src 'self' https://*.supabase.co https://*.supabase.in https://js.stripe.com https://api.stripe.com https://*.stripe.com https: wss:`,
    `frame-src https://js.stripe.com https://hooks.stripe.com`,
    `object-src 'none'`,
    `frame-ancestors 'self'`,
  ].join('; ');

  res.headers.set('Content-Security-Policy', csp);
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');
}

async function userIsDeactivated(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('users')
    .select('status')
    .eq('id', userId)
    .maybeSingle();
  return profile?.status === false;
}

export async function middleware(req: NextRequest) {
  const nonce = crypto.randomUUID();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  const p = req.nextUrl.pathname;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnon);

  // CRIT-12: sin credenciales Supabase, no instanciar cliente SSR (evita 500 global).
  if (!hasSupabaseConfig) {
    const isProtected = isProtectedAppPath(p);

    if (p.startsWith('/admin') || isProtected) {
      const url = req.nextUrl.clone();
      url.pathname = p.startsWith('/admin') ? '/login' : '/login';
      if (p.startsWith('/admin') || isProtected) {
        url.searchParams.set('next', req.nextUrl.pathname);
      }
      url.searchParams.set('error', 'supabase_config');
      const redirect = NextResponse.redirect(url);
      applySecurityHeaders(redirect, nonce);
      return redirect;
    }

    applySecurityHeaders(res, nonce);
    return res;
  }

  const supabase = createServerClient(supabaseUrl!, supabaseAnon!, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set({ name, value, ...options });
        });
      },
    },
  });

  if (p.startsWith('/admin')) {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', p);
      return NextResponse.redirect(url);
    }
    const allowed = await userCanAccessAdminPanel(supabase, user);
    if (!allowed) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(url);
    }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isProtected = isProtectedAppPath(p);

  if (isProtected && !session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (session && isProtected) {
    const deactivated = await userIsDeactivated(supabase, session.user.id);
    if (deactivated) {
      const url = req.nextUrl.clone();
      url.pathname = '/logout';
      url.searchParams.set('reason', 'disabled');
      return NextResponse.redirect(url);
    }
  }

  if (session && (p === '/login' || p === '/registro')) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  applySecurityHeaders(res, nonce);
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
