// =============================================
// Vista LIVE del partido (marcador + stats)
// =============================================
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LiveMatchInitialPayload } from '@/lib/matches/loadLiveMatchInitialData';
import { getSportIconPath } from '@/lib/sports';
import { useWakeLock } from '@/lib/useWakeLock';
import { uploadMatchMedia } from '@/lib/uploadMatchMedia';
import { isIosDevice } from '@/lib/isIosDevice';
import { useStorageProvider } from '@/hooks/useStorageProvider';
import CloudUsageStatus from '@/components/cloud/CloudUsageStatus';
import {
  formatBytes,
  hasQuotaForUpload,
  isVideoDurationAllowed,
  isVideoSizeAllowed,
  getMaxVideoDurationSeconds,
  MAX_VIDEO_FILE_BYTES,
  readVideoDurationSeconds,
} from '@/lib/cloud/guardrails';
import { idbPut } from '@/lib/mediaLocal';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { useT } from '@/i18n/I18nProvider';
import Image from 'next/image';
import Link from 'next/link';

//Components
import BlockingLoader from '@/components/BlockingLoader';
import Input from '@/components/Input';
import Submit from '@/components/Submit';
import Textarea from '@/components/Textarea';
import TitleH1 from '@/components/TitleH1';
import { MatchMediaCaptureInputs } from '@/components/MatchMediaCaptureInputs';

type MatchRow = LiveMatchInitialPayload['match'];
type Competition = NonNullable<LiveMatchInitialPayload['competition']>;
type Season = NonNullable<LiveMatchInitialPayload['season']>;
type Sport = NonNullable<LiveMatchInitialPayload['sport']>;
type Team = NonNullable<LiveMatchInitialPayload['myTeam']>;

type LiveMatchViewProps = {
  matchId: string;
  initial: LiveMatchInitialPayload;
};

export default function LiveMatchView({ matchId, initial }: LiveMatchViewProps) {
    const t = useT();
    const { provider, storedProvider, loading: storageLoading, applyDriveReconnectFallback } = useStorageProvider();

    const { active: wakeActive, requesting: wakeRequesting, request: wakeRequest, release: wakeRelease } = useWakeLock();

    const [isSaving, setIsSaving]   = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const [match] = useState<MatchRow>(initial.match);
    const [competition] = useState<Competition | null>(initial.competition);
    const [sport] = useState<Sport | null>(initial.sport);
    const [myTeam] = useState<Team | null>(initial.myTeam);
    const [season] = useState<Season | null>(initial.season);

    const initialMy = Number.isFinite(Number(initial.match.my_score)) ? Number(initial.match.my_score) : 0;
    const initialRival = Number.isFinite(Number(initial.match.rival_score)) ? Number(initial.match.rival_score) : 0;

    // Estado editable
    const [myScore, setMyScore]       = useState<number>(initialMy);
    const [rivalScore, setRivalScore] = useState<number>(initialRival);
    const [leftScoreDraft, setLeftScoreDraft] = useState<string | null>(null);
    const [rightScoreDraft, setRightScoreDraft] = useState<string | null>(null);
    const [notes, setNotes]           = useState<string>(initial.match.notes || '');
    const [stats, setStats]           = useState<Record<string, any>>((initial.match.stats as Record<string, any>) || {});

    const [busyMedia, setBusyMedia] = useState(false);
    const [pendingExisting, setPendingExisting] = useState<File[] | null>(null);
    const [platformReady, setPlatformReady] = useState(false);
    const [iosDevice, setIosDevice] = useState(false);
    const existingInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        setIosDevice(isIosDevice());
        setPlatformReady(true);
    }, []);

    const showExistingFiles =
        !storageLoading &&
        platformReady &&
        !iosDevice &&
        (storedProvider === 'local' || storedProvider === 'drive');
    const [busyMsg] = useState<string | undefined>(undefined);
    //const [uploadStep, setUploadStep] = useState<string | null>(null);

    const uploadMatchMediaToR2 = useCallback(async (file: File, currentMatch: MatchRow) => {
        const usageRes = await fetch('/api/cloud/usage', { cache: 'no-store' });
        if (!usageRes.ok) throw new Error(t('cloud_usage_error'));
        const usageJson = await usageRes.json() as {
            usage?: {
                bytes_used: number;
                bytes_quota: number;
                bytes_remaining: number;
                percentage_used: number;
                plan_gb: number;
            };
        };
        const usage = usageJson.usage;
        if (!usage || usage.bytes_quota <= 0) {
            throw new Error(t('storage_selecciona_plan'));
        }
        if (!hasQuotaForUpload(usage.bytes_used, usage.bytes_quota, file.size)) {
            throw new Error(
                t('cloud_usage_block_not_enough_space', {
                    FILE_SIZE: formatBytes(file.size),
                    AVAILABLE: formatBytes(usage.bytes_remaining),
                })
            );
        }

        let durationSeconds: number | null = null;
        if (file.type.startsWith('video/')) {
            if (!isVideoSizeAllowed(file.size)) {
                throw new Error(
                    t('cloud_usage_block_file_too_large', {
                        FILE_SIZE: formatBytes(file.size),
                        MAX: formatBytes(MAX_VIDEO_FILE_BYTES),
                    })
                );
            }
            durationSeconds = await readVideoDurationSeconds(file);
            if (!durationSeconds) {
                throw new Error(t('cloud_usage_block_video_metadata_unreadable'));
            }
            const maxDuration = getMaxVideoDurationSeconds(usage.plan_gb);
            if (!isVideoDurationAllowed(durationSeconds, usage.plan_gb)) {
                throw new Error(
                    t('cloud_usage_block_video_too_long', {
                        DURATION: durationSeconds,
                        MAX: maxDuration,
                    })
                );
            }
        }

        const mediaId = crypto.randomUUID();
        const deviceKey = `media:${mediaId}`;
        await idbPut(deviceKey, file);

        const form = new FormData();
        form.append('file', file);
        form.append('matchId', currentMatch.id);
        form.append('mediaId', mediaId);
        form.append('device_uri', deviceKey);
        form.append('playerId', currentMatch.player_id ?? '');
        if (durationSeconds) form.append('duration_seconds', String(durationSeconds));

        const uploadRes = await fetchWithTimeout('/api/r2/upload', {
            method: 'POST',
            body: form,
        });
        const uploadBody = await uploadRes.json().catch(() => ({} as any));
        if (!uploadRes.ok) {
            if (uploadBody?.code === 'QUOTA_EXCEEDED') {
                throw new Error(
                    t('cloud_usage_block_not_enough_space', {
                        FILE_SIZE: formatBytes(file.size),
                        AVAILABLE: formatBytes(uploadBody.bytesRemaining ?? 0),
                    })
                );
            }
            if (uploadBody?.code === 'VIDEO_FILE_TOO_LARGE') {
                throw new Error(
                    t('cloud_usage_block_file_too_large', {
                        FILE_SIZE: formatBytes(file.size),
                        MAX: formatBytes(uploadBody.maxBytes ?? MAX_VIDEO_FILE_BYTES),
                    })
                );
            }
            if (uploadBody?.code === 'VIDEO_DURATION_EXCEEDED') {
                throw new Error(
                    t('cloud_usage_block_video_too_long', {
                        DURATION: durationSeconds ?? 0,
                        MAX: uploadBody.maxDurationSeconds ?? getMaxVideoDurationSeconds(usage.plan_gb),
                    })
                );
            }
            if (uploadBody?.code === 'VIDEO_METADATA_UNREADABLE') {
                throw new Error(t('cloud_usage_block_video_metadata_unreadable'));
            }
            throw new Error(uploadBody?.error || 'Error al subir archivo a R2');
        }

        window.dispatchEvent(new CustomEvent('cloud-usage-refresh'));
    }, [t]);

    const onFilesSelected = useCallback(async (fileList: FileList | null, kind: 'image'|'video', inputEl?: HTMLInputElement | null) => {
        if (!fileList || !fileList.length || !match) return;

        setBusyMedia(true);
        setSaveError(null);
        let driveReconnectNotice: string | null = null;
        const choseDriveExplicitly = storedProvider === 'drive';
        try {
            for (const file of Array.from(fileList)) {
                if (provider === 'r2') {
                    await uploadMatchMediaToR2(file, match);
                } else if (provider === 'drive') {
                    const form = new FormData();
                    form.append('file', file);
                    form.append('matchId', match.id);
                    form.append('playerId', match.player_id ?? '');
                    const res = await fetch('/api/google/drive/upload', {
                        method: 'POST',
                        body: form,
                    });
                    const payload = await res.json().catch(() => ({} as {
                        error?: string;
                        code?: string;
                        fallbackLocal?: boolean;
                    }));
                    if (!res.ok) {
                        const driveUnavailable =
                            res.status === 503 ||
                            payload?.code === 'DRIVE_NOT_CONFIGURED' ||
                            payload?.code === 'reconnect-required';
                        if (driveUnavailable) {
                            if (payload?.code === 'reconnect-required') {
                                applyDriveReconnectFallback();
                            }
                            await uploadMatchMedia({
                                matchId: match.id,
                                playerId: match.player_id ?? null,
                                file,
                                kind,
                                provider: 'local',
                            });
                            if (choseDriveExplicitly || payload?.code === 'reconnect-required') {
                                driveReconnectNotice =
                                    t('storage_drive_reconnect_saved_locally') ||
                                    'No pudimos usar Google Drive. El archivo se guardó en este dispositivo. Reconecta Drive en ajustes de almacenamiento.';
                            }
                            continue;
                        }
                        throw new Error(payload?.error || t('storage_settings_drive_unavailable_reason'));
                    }
                } else {
                    await uploadMatchMedia({
                        matchId: match.id,
                        playerId: match.player_id ?? null,
                        file,
                        kind, // el helper normaliza por MIME igualmente
                        provider: 'local',
                    });
                }
            }
            if (driveReconnectNotice) {
                setSaveError(driveReconnectNotice);
            }
            window.dispatchEvent(new CustomEvent('cloud-usage-refresh'));
        } catch (e: any) {
            const msg =
              e?.message === 'UPLOAD_TIMEOUT'
                ? (t('upload_timeout') || 'La subida tardó demasiado. Comprueba la conexión e inténtalo de nuevo.')
                : (e?.message || 'Error al procesar los ficheros');
            setSaveError(msg);
        } finally {
            if (inputEl) inputEl.value = '';
            setBusyMedia(false);
        }
    }, [match, provider, storedProvider, applyDriveReconnectFallback, uploadMatchMediaToR2, t]);

    const clearExistingInput = useCallback(() => {
        if (existingInputRef.current) existingInputRef.current.value = '';
    }, []);

    const saveExistingBatch = useCallback(async (files: File[], destination: 'local' | 'drive') => {
        if (!match || files.length === 0) return;

        setBusyMedia(true);
        setSaveError(null);
        let driveReconnectNotice: string | null = null;
        try {
            for (const file of files) {
                const kind: 'image' | 'video' = file.type?.startsWith('video/') ? 'video' : 'image';
                if (destination === 'local') {
                    await uploadMatchMedia({
                        matchId: match.id,
                        playerId: match.player_id ?? null,
                        file,
                        kind,
                        provider: 'local',
                    });
                    continue;
                }

                const form = new FormData();
                form.append('file', file);
                form.append('matchId', match.id);
                form.append('playerId', match.player_id ?? '');
                const res = await fetch('/api/google/drive/upload', {
                    method: 'POST',
                    body: form,
                });
                const payload = await res.json().catch(() => ({} as {
                    error?: string;
                    code?: string;
                }));
                if (!res.ok) {
                    const driveUnavailable =
                        res.status === 503 ||
                        payload?.code === 'DRIVE_NOT_CONFIGURED' ||
                        payload?.code === 'reconnect-required';
                    if (driveUnavailable) {
                        if (payload?.code === 'reconnect-required') {
                            applyDriveReconnectFallback();
                        }
                        await uploadMatchMedia({
                            matchId: match.id,
                            playerId: match.player_id ?? null,
                            file,
                            kind,
                            provider: 'local',
                        });
                        driveReconnectNotice =
                            t('storage_drive_reconnect_saved_locally') ||
                            'No pudimos usar Google Drive. El archivo se guardó en este dispositivo. Reconecta Drive en ajustes de almacenamiento.';
                        continue;
                    }
                    throw new Error(payload?.error || t('storage_settings_drive_unavailable_reason'));
                }
            }
            if (driveReconnectNotice) {
                setSaveError(driveReconnectNotice);
            }
            window.dispatchEvent(new CustomEvent('cloud-usage-refresh'));
        } catch (e: any) {
            const msg =
                e?.message === 'UPLOAD_TIMEOUT'
                    ? (t('upload_timeout') || 'La subida tardó demasiado. Comprueba la conexión e inténtalo de nuevo.')
                    : (e?.message || 'Error al procesar los ficheros');
            setSaveError(msg);
        } finally {
            clearExistingInput();
            setBusyMedia(false);
        }
    }, [match, applyDriveReconnectFallback, t, clearExistingInput]);

    const cancelExistingDestination = useCallback(() => {
        setPendingExisting(null);
        clearExistingInput();
    }, [clearExistingInput]);

    const confirmExistingDestination = useCallback((destination: 'local' | 'drive') => {
        const files = pendingExisting;
        setPendingExisting(null);
        if (!files?.length) return;
        void saveExistingBatch(files, destination);
    }, [pendingExisting, saveExistingBatch]);

    // Ref para que el debounce de inputs de marcador capture siempre los valores más recientes
    const latestScoresRef = useRef({ my: myScore, rival: rivalScore });
    useEffect(() => {
        latestScoresRef.current = { my: myScore, rival: rivalScore };
    }, [myScore, rivalScore]);

    // Debounce SOLO para notas/stats
    const savingRef = useRef<NodeJS.Timeout | null>(null);
    const scheduleSave = useCallback(() => {
        if (savingRef.current) clearTimeout(savingRef.current);

        const payload = {
        notes,
        stats: Object.keys(stats || {}).length ? stats : null,
        };

        savingRef.current = setTimeout(async () => {
        try {
            const res = await fetch(`/api/matches/${matchId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            });
            if (!res.ok) {
            const { error: errMsg } = await res.json().catch(() => ({ error: 'Error' }));
            setSaveError(errMsg || 'No se pudo guardar');
            }
        } catch (e: any) {
            setSaveError(e?.message || 'No se pudo guardar');
        }
        }, 600);
    }, [matchId, notes, stats]);

    useEffect(() => () => { if (savingRef.current) clearTimeout(savingRef.current); }, []);

    useEffect(() => {
        const onSync = (ev: Event) => {
            const detail = (ev as CustomEvent<{ failed?: number; remaining?: number }>).detail;
            if (!detail) return;
            if (detail.remaining && detail.remaining > 0) {
                setSaveError(t('media_sync_pending') || 'Algunos archivos siguen pendientes de sincronizar.');
            } else if (detail.failed && detail.failed > 0) {
                setSaveError(t('media_sync_failed') || 'No se pudieron sincronizar algunos archivos.');
            }
        };
        window.addEventListener('media-sync-status', onSync);
        return () => window.removeEventListener('media-sync-status', onSync);
    }, [t]);

    // Auto-activar pantalla en el primer gesto del usuario
    useEffect(() => {
        const onFirst = async () => { try { await wakeRequest(); } catch {} };
        window.addEventListener('pointerdown', onFirst, { once: true, passive: true });
        window.addEventListener('keydown', onFirst, { once: true });
        return () => {
        window.removeEventListener('pointerdown', onFirst);
        window.removeEventListener('keydown', onFirst);
        };
    }, [wakeRequest]);

    // Lado local
    const leftIsHome = !!match?.is_home;

    // Guardado inmediato del marcador
    const updateScores = useCallback(async (deltaLeft: number, side: 'left' | 'right') => {
        let nextMy = myScore;
        let nextRival = rivalScore;

        if (leftIsHome) {
            if (side === 'left') nextMy = Math.max(0, myScore + deltaLeft);
            else                 nextRival = Math.max(0, rivalScore + deltaLeft);
        } else {
            if (side === 'left') nextRival = Math.max(0, rivalScore + deltaLeft);
            else                 nextMy = Math.max(0, myScore + deltaLeft);
        }

        if (savingRef.current) {
            clearTimeout(savingRef.current);
            savingRef.current = null;
        }
        setLeftScoreDraft(null);
        setRightScoreDraft(null);

        // Optimistic UI
        setMyScore(nextMy);
        setRivalScore(nextRival);

        try {
        const res = await fetch(`/api/matches/${matchId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ my_score: nextMy, rival_score: nextRival }),
        });
        if (!res.ok) {
            const { error: errMsg } = await res.json().catch(() => ({ error: 'Error' }));
            setMyScore(myScore); setRivalScore(rivalScore);
            setSaveError(errMsg || 'No se pudo actualizar el marcador');
        }
        } catch (e: any) {
        setMyScore(myScore); setRivalScore(rivalScore);
        setSaveError(e?.message || 'No se pudo actualizar el marcador');
        }
    }, [leftIsHome, myScore, rivalScore, matchId]);

    // Handlers ±
    const incLeft  = () => void updateScores(+1, 'left');
    const decLeft  = () => void updateScores(-1, 'left');
    const incRight = () => void updateScores(+1, 'right');
    const decRight = () => void updateScores(-1, 'right');

    const backToListUrl = `/players/${match?.player_id}/competitions/${match?.competition_id}/matches`;

    async function handleDeleteConfirm() {
        setIsDeleting(true);
        try {
        const res = await fetch(`/api/matches/${matchId}`, { method: 'DELETE' });
        if (!res.ok) {
            const { error: errMsg } = await res.json().catch(() => ({ error: 'Error' }));
            setSaveError(errMsg || 'No se pudo eliminar');
            setIsDeleting(false);
            return;
        }
        window.location.href = backToListUrl;
        } catch (e: any) {
        setSaveError(e?.message || 'No se pudo eliminar');
        setIsDeleting(false);
        }
    }

    const myTeamName = myTeam?.name || (t('mi_equipo') || 'Mi equipo');
    const leftLabel  = leftIsHome ? myTeamName : (match.rival_team_name || t('equipo_rival') || 'Equipo rival');
    const rightLabel = leftIsHome ? (match.rival_team_name || t('equipo_rival') || 'Equipo rival') : myTeamName;

    const seasonLabel =
    season?.year_start && season?.year_end
      ? `${season.year_start}-${season.year_end}`
      : (t('temporada') || 'Temporada');

    const leftScore  = leftIsHome ? myScore    : rivalScore;
    const rightScore = leftIsHome ? rivalScore : myScore;

    const statDefs: Array<{ key: string; label: string; type: 'number' | 'text' | 'boolean' }> = (() => {
        const raw = sport?.stats;
        if (!raw) return [];
        const normalizeType = (value: unknown): 'number' | 'text' | 'boolean' => {
            const text = String(value ?? '').toLowerCase();
            if (text.includes('bool')) return 'boolean';
            if (text.includes('int') || text.includes('num') || text.includes('float')) return 'number';
            return 'text';
        };
        const fields: Array<{ key: string; label: string; type: 'number' | 'text' | 'boolean' }> = [];
        const pushField = (f: any) => {
            const key = f?.key ?? f?.name ?? f?.id;
            if (!key) return;
            const label = f?.label && String(f.label).trim().length ? f.label : key;
            fields.push({ key, label, type: normalizeType(f?.type) });
        };
        if (Array.isArray((raw as any)?.fields)) (raw as any).fields.forEach(pushField);
        else if (Array.isArray(raw)) (raw as any[]).forEach(pushField);
        else if (raw && typeof raw === 'object') Object.values(raw as Record<string, any>).forEach(pushField);
        return fields;
    })();

    function setStat(key: string, type: 'number' | 'text' | 'boolean', value: any) {
        setStats(prev => {
        const next = { ...(prev || {}) };
        let casted: any = value;
        if (type === 'number') { casted = value === '' ? null : Number(value); if (Number.isNaN(casted)) casted = null; }
        else if (type === 'boolean') { casted = !!value; }
        if (casted === null || casted === undefined || (type === 'text' && casted === '')) delete next[key];
        else next[key] = casted;
        return next;
        });
        scheduleSave();
    }

    function handleScoreInput(side: 'left' | 'right', raw: string) {
        if (!/^\d*$/.test(raw)) return;

        if (side === 'left') setLeftScoreDraft(raw);
        else setRightScoreDraft(raw);

        if (raw === '') return;

        const n = Math.max(0, parseInt(raw, 10) || 0);

        if (side === 'left') {
            if (leftIsHome) { setMyScore(n);    latestScoresRef.current = { ...latestScoresRef.current, my: n }; }
            else            { setRivalScore(n); latestScoresRef.current = { ...latestScoresRef.current, rival: n }; }
        } else {
            if (leftIsHome) { setRivalScore(n); latestScoresRef.current = { ...latestScoresRef.current, rival: n }; }
            else            { setMyScore(n);    latestScoresRef.current = { ...latestScoresRef.current, my: n }; }
        }

        if (savingRef.current) clearTimeout(savingRef.current);
        savingRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/matches/${matchId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        my_score:    latestScoresRef.current.my,
                        rival_score: latestScoresRef.current.rival,
                    }),
                });
                if (!res.ok) {
                    const { error: errMsg } = await res.json().catch(() => ({ error: 'Error' }));
                    setSaveError(errMsg || 'No se pudo guardar');
                }
            } catch (e: any) {
                setSaveError(e?.message || 'No se pudo guardar');
            }
        }, 600);
    }

    async function flushNow() {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/matches/${matchId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  my_score: myScore,
                  rival_score: rivalScore,
                  notes,
                  stats: Object.keys(stats || {}).length ? stats : null,
                }),
            });
            if (!res.ok) {
                const { error: errMsg } = await res.json().catch(() => ({ error: 'Error' }));
                setSaveError(errMsg || 'No se pudo guardar');
            }
        } catch (e: any) {
            setSaveError(e?.message || 'No se pudo guardar');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <>
            <div className="max-w-4xl mx-auto pb-28">
                {/* Ocultar el footer global SOLO en esta página */}
                <style jsx global>{`footer{display:none !important}`}</style>
                <style jsx>{`
                @media (max-width: 500px) {
                    .responsive-button { width: 46px; height: 46px; }
                }
                `}</style>

                <div className="relative">
                    <TitleH1>
                        <span className="block md:inline">{leftLabel}</span>
                        <span className="block md:inline md:px-2 text-base md:text-inherit text-gray-700">vs</span>
                        <span className="block md:inline">{rightLabel}</span>
                    </TitleH1>

                    {/* Icono a la derecha, con margen máximo 15px */}
                    {sport?.name && getSportIconPath(sport.name) && (
                        <Image
                        src={getSportIconPath(sport.name)!}
                        alt={sport.name || 'deporte'}
                        width={60}
                        height={60}
                        className="absolute top-1/2 -translate-y-1/2 right-0 select-none"
                        style={{ objectFit: 'contain' }}
                        priority
                        />
                    )}
                </div>

                {saveError && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
                        {saveError}
                        <button
                            type="button"
                            className="ml-3 underline"
                            onClick={() => setSaveError(null)}
                        >
                            {t('cerrar') || 'Cerrar'}
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-2 mb-4">
                    <a href={backToListUrl} className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg shadow transition">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{t('competicion_volver') || 'Partidos de la competición'}</span>
                    </a>
                    <Link
                        href={`/matches/${matchId}/edit`}
                        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg shadow transition"
                    >
                        {t('editar') || 'Editar'}
                    </Link>
                    <button
                        type="button"
                        onClick={() => setDeleteOpen(true)}
                        aria-label={t('eliminar') || 'Eliminar'}
                        title={t('eliminar') || 'Eliminar'}
                        className="ml-auto inline-flex items-center justify-center rounded-lg bg-red-100 p-2 text-red-700 hover:bg-red-200"
                    >
                        {/* Trash icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                    </button>
                </div>

                {/* Cabecera */}
                <div className="text-sm text-gray-700 mb-4 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                    <div>{t('temporada')}: <b>{seasonLabel}</b></div>
                    <div>{t('competicion')}: <b>{sport?.name} - {competition?.name}</b></div>
                    <div>{t('fecha')}: <b>{new Date(match.date_at).toLocaleString()}</b></div>
                    <div>{t('lugar')}: <b>{match.place}</b></div>
                </div>

                <div className="mb-4">
                    <CloudUsageStatus enabled={provider === 'r2'} />
                </div>

                {/* Marcador */}
                <div className="grid grid-cols-2 gap-6 items-center my-6">
                    {/* Izquierda */}
                    <div className="text-center">
                        <div className="text-sm mb-2 text-green-700 font-bold text-center" style={{ fontSize: '1.1rem' }}>
                            <span className="bg-green-700 text-white rounded-md px-3 py-1">{leftLabel}</span>
                        </div>
                        <div className="flex items-center justify-center gap-4">
                            <div className="flex flex-col gap-2">
                                <button type="button" aria-label="+1" className="rounded-md px-3 py-2 border" onClick={incLeft}>+</button>
                                <button type="button" aria-label="-1" className="rounded-md px-3 py-2 border" onClick={decLeft}>-</button>
                            </div>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={leftScoreDraft ?? String(leftScore)}
                                onChange={(e) => handleScoreInput('left', e.target.value)}
                                className="border rounded-md w-24 sm:w-28 md:w-32 lg:w-40 aspect-square text-5xl md:text-6xl font-bold text-center bg-white"

                                aria-label={leftLabel}
                            />
                        </div>
                    </div>

                    {/* Derecha */}
                    <div className="text-center">
                        <div className="text-sm mb-2 text-green-700 font-bold text-center" style={{ fontSize: '1.1rem' }}>
                            <span className="bg-green-700 text-white rounded-md px-3 py-1">{rightLabel}</span>
                        </div>
                        <div className="flex items-center justify-center gap-4">
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={rightScoreDraft ?? String(rightScore)}
                                onChange={(e) => handleScoreInput('right', e.target.value)}
                                className="border rounded-md w-24 sm:w-28 md:w-32 lg:w-40 aspect-square text-5xl md:text-6xl font-bold text-center bg-white"

                                aria-label={rightLabel}
                            />
                            <div className="flex flex-col gap-2">
                                <button type="button" aria-label="+1" className="rounded-md px-3 py-2 border" onClick={incRight}>+</button>
                                <button type="button" aria-label="-1" className="rounded-md px-3 py-2 border" onClick={decRight}>-</button>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="text-center text-gray-500 font-bold underline">{t('recuerda_guardar_cambios')}</p>

                {/* Stats */}
                {statDefs.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-3">{t('estadisticas_individuales') || 'Estadísticas individuales'}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-0">
                    {statDefs.map((f) =>
                        f.type === 'boolean' ? (
                        <label key={f.key} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={!!stats[f.key]} onChange={(e)=>setStat(f.key, 'boolean', e.target.checked)} /> {f.label}
                        </label>
                        ) : (
                        <Input
                            key={f.key}
                            label={f.label}
                            type={f.type==='number' ? 'number' : 'text'}
                            noSpinner={f.type==='number'}
                            value={stats[f.key] ?? ''}
                            onChange={(e:any)=>setStat(f.key, f.type, e.target.value)}
                        />
                        )
                    )}
                    </div>
                </div>
                )}

                <div className="mt-0">
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="notes">
                        {t('comentarios') || 'Comentarios'}
                    </label>
                    <Textarea value={notes} onChange={(e:any)=>{ setNotes(e.target.value); scheduleSave(); }} />
                </div>

                {/* Barra inferior */}
                <div className="fixed bottom-0 left-0 right-0 border-t bg-white/95 backdrop-blur p-3">
                    <div className={`max-w-4xl mx-auto grid gap-3 items-stretch ${showExistingFiles ? 'grid-cols-6' : 'grid-cols-5'}`}>
                        {/* Pantalla activa */}
                        <button
                        type="button"
                        onClick={() => (wakeActive ? wakeRelease() : wakeRequest())}
                        disabled={wakeRequesting}
                        className={`inline-flex items-center justify-center rounded-lg px-2 text-xs font-semibold
                                    ${wakeActive ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}
                                    border ${wakeActive ? 'border-emerald-600' : 'border-gray-300'} responsive-button`}
                        title={wakeActive ? (t('pantalla_activa') || 'Pantalla activa') : (t('mantener_pantalla') || 'Mantener pantalla encendida')}
                        >
                        <span aria-hidden>🔆</span>
                        <span className="sr-only">
                            {wakeActive ? (t('pantalla_activa') || 'Pantalla activa') : (t('mantener_pantalla') || 'Mantener pantalla encendida')}
                        </span>
                        </button>

                        <MatchMediaCaptureInputs busyMedia={busyMedia} onFilesSelected={onFilesSelected} />

                        {/* Galería */}
                        <Link
                        href={`/matches/${matchId}/gallery`}
                        className="grid place-content-center gap-1 border border-gray-300 rounded-lg text-xs responsive-button"
                        >
                        <div className="text-base text-center">🖼️</div>
                        <div className="font-medium">{t('galeria') || 'Galería'}</div>
                        </Link>

                        {showExistingFiles && (
                        <label className="block responsive-button cursor-pointer">
                            <input
                                ref={existingInputRef}
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                className="hidden"
                                disabled={busyMedia}
                                onChange={(e) => {
                                    const list = e.currentTarget.files;
                                    if (!list || list.length === 0) return;
                                    setPendingExisting(Array.from(list));
                                }}
                            />
                            <span
                                className={`grid place-content-center gap-1 border rounded-lg text-xs border-gray-300 ${
                                    busyMedia ? 'opacity-60 pointer-events-none' : ''
                                }`}
                            >
                                <span className="text-base text-center" aria-hidden>
                                    {busyMedia ? '⏳' : '📎'}
                                </span>
                                <span className="font-medium">{t('archivos_existentes') || 'Archivos'}</span>
                            </span>
                        </label>
                        )}

                        {/* Guardar manual */}
                        <Submit
                        onClick={flushNow as any}
                        text={t('guardar') || 'Guardar'}
                        loadingText={t('guardando') || 'Guardando…'}
                        loading={isSaving}
                        className="responsive-submit-button"
                        />
                    </div>
                </div>
            </div>

            <BlockingLoader
                open={busyMedia}
                title={busyMsg || (t('guardando_archivo') || 'Guardando archivo…')}
                subtitle={t('no_cierres_app') || 'No cierres la aplicación ni bloquees la pantalla.'}
            />

            {pendingExisting && pendingExisting.length > 0 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="destino-lote-titulo">
                    <div className="absolute inset-0 bg-black/40" onClick={() => !busyMedia && cancelExistingDestination()} aria-hidden="true"></div>
                    <div className="relative z-10 w-full max-w-sm rounded-lg bg-white p-4 shadow-lg">
                        <h2 id="destino-lote-titulo" className="text-lg font-semibold text-gray-900">
                            {t('destino_lote_titulo') || 'Dónde guardar este lote'}
                        </h2>
                        <p className="mt-2 text-sm text-gray-700">
                            {t('destino_lote_texto') || 'Elige si este lote se queda en este dispositivo o se sube a Google Drive.'}
                        </p>
                        <div className="mt-4 flex flex-col gap-2">
                            <button
                                type="button"
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                                onClick={() => confirmExistingDestination('local')}
                            >
                                {t('destino_local') || 'En este dispositivo'}
                            </button>
                            <button
                                type="button"
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                                onClick={() => confirmExistingDestination('drive')}
                            >
                                {t('destino_drive') || 'Google Drive'}
                            </button>
                            <button
                                type="button"
                                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                                onClick={cancelExistingDestination}
                            >
                                {t('cancelar') || 'Cancelar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal eliminar */}
            {deleteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/40" onClick={() => !isDeleting && setDeleteOpen(false)} aria-hidden="true"></div>
                    
                    <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl">
                        <div className="px-6 pt-5">
                            <h3 className="text-base font-semibold text-gray-900">{t('partido_eliminar_confirmar') || 'Confirmar eliminación'}</h3>
                            <p className="mt-2 text-sm text-gray-600">{t('partido_eliminar_texto_modal') || 'Si eliminas este partido, se borrarán todos sus datos. Esta acción es irreversible.'}</p>
                        </div>
                        <div className="mt-5 flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                            <button
                                type="button"
                                onClick={() => setDeleteOpen(false)}
                                disabled={isDeleting}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                {t('volver_atras')}
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold text-white ${isDeleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                {isDeleting ? (t('eliminando') || 'Eliminando…') : (t('partido_eliminar_confirmar') || 'Confirmar eliminación')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
