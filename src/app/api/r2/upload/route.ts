// src/app/api/r2/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getR2Client, getR2Bucket, getR2PublicUrl } from '@/lib/r2/client';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { guessExt } from '@/lib/uploadMatchMedia';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

        // Verificar suscripción R2 activa
        const { data: r2Sub } = await supabase
            .from('storage_subscriptions')
            .select('status, current_period_end')
            .eq('user_id', user.id)
            .maybeSingle();

        const hasR2 =
            r2Sub?.status === 'active' &&
            r2Sub.current_period_end &&
            new Date(r2Sub.current_period_end) > new Date();

        if (!hasR2) {
            return NextResponse.json({ error: 'Sin suscripción R2 activa.' }, { status: 403 });
        }

        const form = await req.formData();
        const file = form.get('file') as File | null;
        const matchId = form.get('matchId') as string | null;

        if (!file) return NextResponse.json({ error: 'Falta el archivo.' }, { status: 400 });
        if (!matchId) return NextResponse.json({ error: 'Falta matchId.' }, { status: 400 });

        const mediaId = crypto.randomUUID();
        const ext = guessExt(file.type) || '.bin';
        const key = `${user.id}/matches/${matchId}/${mediaId}${ext}`;

        const buffer = Buffer.from(await file.arrayBuffer());

        const r2 = getR2Client();
        await r2.send(new PutObjectCommand({
            Bucket: getR2Bucket(),
            Key: key,
            Body: buffer,
            ContentType: file.type || 'application/octet-stream',
        }));

        const publicUrl = `${getR2PublicUrl()}/${key}`;
        return NextResponse.json({ path: key, url: publicUrl });

    } catch (err: any) {
        console.error('[R2 upload]', err);
        return NextResponse.json({ error: err?.message || 'Error interno.' }, { status: 500 });
    }
}
