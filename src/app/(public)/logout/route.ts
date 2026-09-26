import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function resolveRedirectOrigin(request: Request): string {
  try {
    return new URL(request.url).origin;
  } catch {
    if (process.env.NEXT_PUBLIC_APP_URL) {
      try {
        return new URL(process.env.NEXT_PUBLIC_APP_URL).origin;
      } catch {
        /* fall through */
      }
    }
    return 'http://localhost:3000';
  }
}

async function clearSupabaseCookies() {
  const jar = await cookies();
  try {
    const names = [
      'sb-access-token',
      'sb-refresh-token',
      'sb-supabase-auth-token',
      'sb-auth-token',
    ];
    for (const name of names) {
      try {
        jar.delete(name);
      } catch {
        /* ignore */
      }
    }
    jar.getAll().forEach((c) => {
      if (c.name.startsWith('sb-')) {
        try {
          jar.delete(c.name);
        } catch {
          /* ignore */
        }
      }
    });
  } catch {
    /* ignore */
  }
  try {
    jar.set('client-logout', '1', { path: '/', maxAge: 30, httpOnly: false });
  } catch {
    /* ignore */
  }
}

async function handleLogout(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    /* cookies + client flag still run */
  }

  await clearSupabaseCookies();

  const origin = resolveRedirectOrigin(request);
  const target = new URL('/', origin);
  const reason = new URL(request.url).searchParams.get('reason');
  if (reason === 'disabled') {
    target.searchParams.set('notice', 'account_disabled');
  }
  return NextResponse.redirect(target);
}

export async function POST(request: Request) {
  return handleLogout(request);
}

export async function GET(request: Request) {
  return handleLogout(request);
}
