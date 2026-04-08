import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { userCanAccessAdminPanel } from '@/lib/auth/adminAccess';

export async function middleware(req: NextRequest) {
  const nonce = crypto.randomUUID();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);

  const res = NextResponse.next({ request: { headers: requestHeaders } });

  // --- Auth / rutas protegidas ---
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );
  const p = req.nextUrl.pathname;

  // --- /admin: sesión válida + rol Superadmin (o ADMIN_EMAILS) ---
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

  const { data: { session } } = await supabase.auth.getSession();

  const isProtected =
    p.startsWith('/dashboard') ||
    p.startsWith('/players')   ||
    p.startsWith('/account')   ||
    p.startsWith('/subscription')   ||
    p.startsWith('/billing');

  if (isProtected && !session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  if (session && (p === '/login' || p === '/registro')) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // --- CSP: permitir 'unsafe-eval' SOLO en desarrollo ---
  const isDev = process.env.NODE_ENV !== 'production';
  const scriptSrc = [
    `'self'`,
    `'nonce-${nonce}'`,
    `'strict-dynamic'`,
    'https:',
    ...(isDev ? [`'unsafe-eval'`] : []), // <- esto apaga el error en dev
  ].join(' ');

  const csp = [
    `default-src 'self'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `script-src ${scriptSrc}`,
    // 'unsafe-inline' is required for inline style="" attributes used by
    // Radix UI, animation utilities and custom components (13 occurrences).
    // Nonces cannot protect HTML style attributes — only <style> elements.
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
  // Allow camera/microphone/geolocation for same-origin so getUserMedia works
  // Note: syntax varies by browser; the modern form is `Permissions-Policy`, older is `Feature-Policy`.
  // Here we allow on self. Adjust if you need to allow specific origins: e.g. camera=(self "https://example.com")
  res.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');

  return res;
}

export const config = {
  // Apply to all routes except Next.js internals and static assets.
  // This ensures CSP and security headers are set on every page response.
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
