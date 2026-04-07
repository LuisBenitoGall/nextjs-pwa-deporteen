// src/app/api/r2/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getR2Client, getR2Bucket } from '@/lib/r2/client';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

export const runtime = 'nodejs';

export async function DELETE(req: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

        const { path } = await req.json() as { path?: string };
        if (!path) return NextResponse.json({ error: 'Falta path.' }, { status: 400 });

        // Verificar que el path pertenece al usuario (empieza con userId/)
        if (!path.startsWith(`${user.id}/`)) {
            return NextResponse.json({ error: 'Sin permiso.' }, { status: 403 });
        }

        const r2 = getR2Client();
        await r2.send(new DeleteObjectCommand({
            Bucket: getR2Bucket(),
            Key: path,
        }));

        return NextResponse.json({ ok: true });

    } catch (err: any) {
        console.error('[R2 delete]', err);
        return NextResponse.json({ error: err?.message || 'Error interno.' }, { status: 500 });
    }
}
