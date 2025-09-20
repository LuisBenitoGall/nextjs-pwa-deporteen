import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    const jar = await cookies();
    // Invalidar posibles variantes de cookies de Supabase
    try {
        // Nombres comunes de cookies de Supabase SSR
        const names = [
        'sb-access-token',
        'sb-refresh-token',
        'sb-supabase-auth-token',
        'sb-auth-token',
        ];
        for (const name of names) {
            try { jar.delete(name); } catch {}
        }
        // Además, elimina cualquier cookie que empiece por 'sb-'
        jar.getAll().forEach(c => {
            if (c.name.startsWith('sb-')) {
                try { jar.delete(c.name); } catch {}
        }
        });
    } catch {}
    // Señal al cliente para limpiar su estado local y evitar depender de query params
    try { jar.set('client-logout', '1', { path: '/', maxAge: 30, httpOnly: false }); } catch {}
    return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'));
}

export async function GET() {
  const jar = await cookies();
  try {
    const names = [
      'sb-access-token',
      'sb-refresh-token',
      'sb-supabase-auth-token',
      'sb-auth-token',
    ];
    for (const name of names) {
      try { jar.delete(name); } catch {}
    }
    jar.getAll().forEach(c => {
      if (c.name.startsWith('sb-')) {
        try { jar.delete(c.name); } catch {}
      }
    });
  } catch {}
  try { jar.set('client-logout', '1', { path: '/', maxAge: 30, httpOnly: false }); } catch {}
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'));
}
