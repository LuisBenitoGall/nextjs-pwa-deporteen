import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  // invalidar cookies de supabase; el SDK del cliente también lo hará, esto es hardening
  cookies().delete('sb-access-token');
  cookies().delete('sb-refresh-token');
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'));
}
