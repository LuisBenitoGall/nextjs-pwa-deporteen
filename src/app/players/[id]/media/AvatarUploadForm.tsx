'use client';

import { useState, ChangeEvent } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { validateImageFile, uploadAvatar } from '@/lib/uploadAvatar';
import { useT } from '@/i18n/I18nProvider';
import Submit from '@/components/Submit';

export default function AvatarUploadForm({
    playerId,
    seasonId,
    currentAvatarPath,
}: {
    playerId: string;
    seasonId: string;
    currentAvatarPath: string | null;
}) {
    const t = useT();
    const [file, setFile] = useState<File | null>(null);
    const [fileErr, setFileErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(
        currentAvatarPath && /^https?:\/\//i.test(currentAvatarPath) ? currentAvatarPath : null
    );

    function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        setOk(null);
        setErr(null);
        setFileErr(null);
        const f = e.target.files?.[0] ?? null;
        if (!f) { setFile(null); return; }
        try {
            validateImageFile(f);
            setFile(f);
        } catch {
            setFileErr(t('avatar_formato_invalido'));
            setFile(null);
            e.target.value = '';
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!file) return;
        setErr(null);
        setOk(null);
        setBusy(true);
        try {
            const signedUrl = await uploadAvatar(file, playerId, seasonId);

            const { error: dbErr } = await supabase
                .from('player_seasons')
                .upsert(
                    { player_id: playerId, season_id: seasonId, avatar: signedUrl },
                    { onConflict: 'player_id,season_id', ignoreDuplicates: false }
                );
            if (dbErr) throw dbErr;

            setAvatarUrl(signedUrl);
            setFile(null);
            setOk(t('avatar_actualizado_ok'));
        } catch (e: any) {
            const msg: string = e?.message ?? '';
            setErr(msg === 'avatar_formato_invalido' ? t('avatar_formato_invalido') : msg || t('deportista_crear_error'));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-4">
            {/* Avatar actual */}
            <div className="h-20 w-20 overflow-hidden rounded-full bg-gray-100">
                {avatarUrl ? (
                    <Image
                        src={avatarUrl}
                        alt={t('avatar')}
                        width={80}
                        height={80}
                        unoptimized
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="grid h-full w-full place-content-center text-3xl text-gray-400">
                        🏃
                    </div>
                )}
            </div>

            {ok && (
                <div role="status" className="rounded border p-3 bg-green-50 text-green-700 text-sm">
                    {ok}
                </div>
            )}
            {err && (
                <div role="alert" className="rounded border p-3 bg-red-50 text-red-700 text-sm">
                    {err}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
                <label className="flex items-center justify-center border-2 border-dashed rounded-lg p-6 bg-white cursor-pointer hover:bg-gray-50">
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <div className="text-center">
                        <div className="text-sm text-gray-700">
                            {file ? file.name : t('imagen_selec')}
                        </div>
                        {fileErr && (
                            <div className="text-xs text-red-600 mt-1">{fileErr}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">{t('avatar_max_size')}</div>
                    </div>
                </label>

                <Submit
                    text={t('avatar_actualizar')}
                    loadingText={t('procesando')}
                    loading={busy}
                    disabled={!file || !!fileErr}
                />
            </form>
        </div>
    );
}
