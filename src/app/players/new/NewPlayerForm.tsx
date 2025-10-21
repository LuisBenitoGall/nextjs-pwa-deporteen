'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, ChangeEvent } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getCurrentSeasonId } from '@/lib/seasons';
import { LIMITS } from '@/config/constants';
import { useT } from '@/i18n/I18nProvider';

import Input from '../../../components/Input';
import Select from '../../../components/Select';
import Submit from '../../../components/Submit';
import TitleH1 from '../../../components/TitleH1';

type Sport = { id: string; name: string; slug: string; active?: boolean | null };
type Category = { id: string; name: string; sport_id: string; gender?: 'masculino' | 'femenino' | 'mixto' | null };

type MembershipBlock = {
    sportId: string;
    competitionName: string;
    clubName: string;
    teamName: string;
    categoryId: string | null;
    avatarFile?: File | null;
    avatarPath?: string | null;
};

export default function NewPlayerForm({
    initialSeats,
    initialCode = '',
}: { initialSeats: number; initialCode?: string }) {
    const t = useT();
    const router = useRouter();
    const params = useSearchParams();

    const topRef = useRef<HTMLDivElement>(null);
    function scrollErrorToTop() {
        try { topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
    }

    // Estado base
    const total = Math.max(1, parseInt(params.get('units') || '1', 10));
    const [created] = useState(0);
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [sports, setSports] = useState<Sport[]>([]);
    const [categoriesBySport, setCategoriesBySport] = useState<Record<string, Category[]>>({});
    const [blocks, setBlocks] = useState<MembershipBlock[]>([
        { sportId: '', competitionName: '', clubName: '', teamName: '', categoryId: null, avatarFile: null, avatarPath: null },
    ]);

    const [pendingCode, setPendingCode] = useState(initialCode);
    const [seatsRemaining, setSeatsRemaining] = useState<number | null>(initialSeats ?? null);
    const [checkingSeats, setCheckingSeats] = useState(false);
    const [seasonTitle, setSeasonTitle] = useState('');

    const MAX_BLOCKS = LIMITS.COMPETITION_NUM_MAX_BY_SEASON;
    const canAddMore = (n: number) => n < MAX_BLOCKS;

    // Helpers
    function labelWithGender(c: Category) {
        switch (c.gender) {
        case 'masculino': return `${c.name} (Masculino)`;
        case 'femenino':  return `${c.name} (Femenino)`;
        case 'mixto':     return `${c.name} (Mixto)`;
        default:          return `${c.name} (Mixto)`;
        }
    }

    useEffect(() => {
        (async () => {
        const { data: sportsRaw, error: e1 } = await supabase
            .from('sports')
            .select('id, name, slug, active')
            .order('name', { ascending: true });
        if (!e1) {
            const activeOnly = (sportsRaw || []).filter((s: any) =>
            typeof s.active === 'boolean' ? s.active : true
            );
            setSports(activeOnly as Sport[]);
        } else {
            setErr(e1.message);
        }

        const { data: cats, error: e2 } = await supabase
            .from('sport_categories')
            .select('id, name, gender, sport_id')
            .order('name', { ascending: true })
            .order('gender', { ascending: true });

        if (!e2) {
            const group: Record<string, Category[]> = {};
            (cats || []).forEach((c: any) => {
            group[c.sport_id] = group[c.sport_id] || [];
            group[c.sport_id].push(c as Category);
            });
            setCategoriesBySport(group);
        } else {
            setErr(e2.message);
        }

        const code =
            initialCode ||
            (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pending_access_code') : '') ||
            (typeof localStorage !== 'undefined' ? localStorage.getItem('pending_access_code') : '') ||
            '';
        if (code) setPendingCode(code);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        let mounted = true;
        (async () => {
        setCheckingSeats(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!mounted || !user) return;

            const { data, error } = await supabase.rpc('seats_remaining', { p_user_id: user.id });
            if (!error) {
            const n = typeof data === 'number' ? data : (data?.remaining ?? data?.seats ?? null);
            if (mounted && typeof n === 'number') setSeatsRemaining(n);
            }
        } finally {
            if (mounted) setCheckingSeats(false);
        }
        })();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        const now = new Date();
        const y = now.getFullYear();
        const aug1 = new Date(y, 7, 1);
        const title = now >= aug1 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
        setSeasonTitle(title);
    }, []);

    const addBlock = () => {
        setErr(null);
        setInfo(null);
        setBlocks((b) => {
        if (b.length >= MAX_BLOCKS) {
            setErr(`Máximo ${MAX_BLOCKS} participaciones por deportista.`);
            return b;
        }
        return [...b, { sportId: '', competitionName: '', clubName: '', teamName: '', categoryId: null, avatarFile: null, avatarPath: null }];
        });
    };
    const removeBlock = (idx: number) => setBlocks((b) => b.filter((_, i) => i !== idx));
    const setBlock = <K extends keyof MembershipBlock>(i: number, key: K, value: MembershipBlock[K]) => {
        setBlocks((prev) => {
        const copy = [...prev];
        copy[i] = { ...copy[i], [key]: value };
        return copy;
        });
    };

    async function saveAvatarLocally(file: File, playerId: string, seasonId: string) {
        try {
        // @ts-expect-error experimental API
        if (window.showSaveFilePicker) {
            // @ts-expect-error experimental API
            const handle = await window.showSaveFilePicker({
            suggestedName: `${playerId}-${seasonId}-${file.name}`,
            types: [{ description: 'Imagen', accept: { [file.type || 'image/*']: ['.jpg', '.jpeg', '.png', '.webp'] } }],
            });
            const writable = await handle.createWritable();
            await writable.write(await file.arrayBuffer());
            await writable.close();
            return `fsapi://${handle.name}`;
        }
        } catch { /* noop */ }
        return `local://avatars/${playerId}/${seasonId}/${encodeURIComponent(file.name)}`;
    }

    // Submit ---------------------------------------------------------------
    const createOne = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validación
        if (!name.trim()) {
        setErr('Introduce un nombre.');
        scrollErrorToTop();
        return;
        }
        if (blocks.length > MAX_BLOCKS) {
        setErr(`Máximo ${MAX_BLOCKS} participaciones por deportista.`);
        scrollErrorToTop();
        return;
        }
        for (let i = 0; i < blocks.length; i++) {
        if (!blocks[i].sportId) {
            setErr(`Selecciona el deporte en el bloque ${i + 1}.`);
            scrollErrorToTop();
            return;
        }
        if (!blocks[i].competitionName || !blocks[i].competitionName.trim()) {
            setErr(`Introduce el nombre de la competición en el bloque ${i + 1}.`);
            scrollErrorToTop();
            return;
        }
        }

        setErr(null);
        setInfo(null);
        setBusy(true);

        try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No autenticado.');

        // 0) Barrera seats solo si NO hay código
        if (!pendingCode && seatsRemaining !== null && seatsRemaining <= 0) {
            throw new Error('No te quedan plazas disponibles para crear deportistas.');
        }

        // 1) Garantiza perfil
        {
            const { error: ensureErr } = await supabase.rpc('ensure_profile_server');
            if (ensureErr) throw new Error(`No se pudo garantizar el perfil de usuario: ${ensureErr.message}`);
        }

        // 2) Crear jugador + suscripción (con o sin código) en la misma operación
        const seasonId = await getCurrentSeasonId(supabase);

        const { data: rows, error: rpcErr } = await supabase.rpc(
            'create_player_link_subscription',
            {
                p_full_name: name.trim(),
                p_birthday: null,                 // si no capturas fecha en el formulario
                p_status: true,
                p_code_text: pendingCode?.trim() || null
            }
        );
        if (rpcErr || !rows) throw rpcErr || new Error('No se pudo crear el deportista');

        const row = Array.isArray(rows) ? rows[0] : rows;
        const playerId: string = row.player_id;
        //const subscriptionId: string = row.subscription_id; // por si lo quieres para algo posterior

        // Avatar + player_seasons
        const firstBlock = blocks[0];
        let avatarPath: string | null = null;
        if (firstBlock?.avatarFile) {
            avatarPath = await saveAvatarLocally(firstBlock.avatarFile, playerId, seasonId);
        }
        {
            const { error: psErr } = await supabase
            .from('player_seasons')
            .upsert(
                { player_id: playerId, season_id: seasonId, avatar: avatarPath ?? null },
                { onConflict: 'player_id,season_id', ignoreDuplicates: false }
            );
            if (psErr) throw psErr;
        }

        // clubs/teams/competitions
        for (const b of blocks) {
            // club
            let clubId: string | null = null;
            if (b.clubName.trim()) {
            const { data: club, error: clubErr } = await supabase
                .from('clubs')
                .upsert(
                { name: b.clubName.trim(), player_id: playerId },
                { onConflict: 'player_id,name' }
                )
                .select('id')
                .single();
            if (clubErr) throw clubErr;
            clubId = club!.id;
            }

            // team
            let teamId: string | null = null;
            if (b.teamName.trim()) {
            if (!clubId) throw new Error(t('equipo_necesita_club_aviso'));
            const { data: teamUpsert, error: teamUpErr } = await supabase
                .from('teams')
                .upsert(
                { name: b.teamName.trim(), club_id: clubId, sport_id: b.sportId, player_id: playerId },
                { onConflict: 'player_id,club_id,sport_id,name' }
                )
                .select('id')
                .single();
            if (teamUpErr) throw teamUpErr;
            teamId = teamUpsert!.id;
            }

            // competition (requerida ya validada)
            const payload = {
            player_id: playerId,
            season_id: seasonId,
            sport_id: b.sportId,
            club_id: clubId,
            team_id: teamId,
            category_id: b.categoryId ?? null,
            name: b.competitionName!.trim(),
            };
            const { error: cmpErr } = await supabase.from('competitions').insert(payload);
            if (cmpErr) throw cmpErr;
        }

        router.replace('/dashboard');
        return;
        } catch (e: any) {
        setErr(e?.message ?? t('deportista_crear_error'));
        scrollErrorToTop();
        } finally {
        setBusy(false);
        }
    };

    const remaining = total - created;

    const GENDER_ORDER: Record<NonNullable<Category['gender']>, number> = {
        masculino: 0, femenino: 1, mixto: 2,
    };

    if (checkingSeats) {
        return <div className="p-6">{t('cargando')}</div>;
    }

    return (
        <div className="max-w-xl mx-auto relative">
            <div ref={topRef} />
            <TitleH1>{t('deportista_nuevo')}</TitleH1>

            <div className="mt-2 mb-4 rounded border p-3 bg-blue-50 text-blue-900 text-sm">
                {t('player_nuevo_texto1')}: <b>{remaining}</b>.
                {pendingCode && <span className="ml-2">· {t('codigo_detectado') ?? 'Código aplicado'}</span>}
            </div>

            {info && <div role="status" className="rounded border p-3 bg-green-50 text-green-700 mb-4">{info}</div>}
            {err && <div role="alert" className="rounded border p-3 bg-red-50 text-red-700 mb-4">{err}</div>}

            <form onSubmit={createOne} className="space-y-4" aria-busy={busy}>
                <Input
                value={name}
                onChange={(e: any) => setName(e.target.value)}
                label={t('deportista_nombre')}
                placeholder={t('nombre')}
                required
                />

                <p>{t('player_nuevo_texto2')}</p>

                <h3 className="text-center font-bold">{t('temporada')} {seasonTitle}</h3>

                <div className="space-y-6">
                {blocks.map((b, i) => {
                    const sportCats = b.sportId ? categoriesBySport[b.sportId] || [] : [];
                    return (
                    <div key={i} className="p-4 bg-gray-100 space-y-4 rounded-lg">
                        <div className="flex items-center justify-between">
                        <div className="font-medium">{t('participacion')} #{i + 1}</div>
                        {blocks.length > 1 && (
                            <button type="button" onClick={() => removeBlock(i)} className="text-sm text-red-600 hover:underline">
                            {t('eliminar')}
                            </button>
                        )}
                        </div>

                        <div>
                        <label className="text-sm font-medium">{t('deporte')}</label>
                        <Select
                            name={`sport_${i}`}
                            value={b.sportId}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setBlock(i, 'sportId', e.target.value)}
                            options={sports.map((s) => ({ value: s.id, label: s.name }))}
                            placeholder={t('deporte_selec')}
                            fontSize="sm"
                        />
                        </div>

                        <div>
                        <Input
                            value={b.competitionName}
                            onChange={(e: any) => setBlock(i, 'competitionName', e.target.value)}
                            label={t('competicion')}
                            placeholder={t('competicion_nombre')}
                            helpText={t('competicion_nombre_info')}
                            required
                        />
                        </div>

                        <div>
                        <Select
                            name={`categoryId_${i}`}
                            label={t('categoria')}
                            value={b.categoryId ?? ''}  // scalar
                            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                            setBlock(i, 'categoryId', e.target.value || null)
                            }
                            options={[...sportCats]
                            .sort((a, b) => {
                                if (a.name !== b.name) return a.name.localeCompare(b.name, 'es');
                                const ga = a.gender ?? 'mixto';
                                const gb = b.gender ?? 'mixto';
                                return GENDER_ORDER[ga] - GENDER_ORDER[gb];
                            })
                            .map((c) => ({ value: c.id, label: labelWithGender(c) }))}
                            placeholder={sportCats.length === 0 ? t('deporte_selec_primero') : t('categoria_selec')}
                            fontSize="sm"
                        />
                        </div>

                        <Input
                        value={b.clubName}
                        onChange={(e: any) => setBlock(i, 'clubName', e.target.value)}
                        label="Club"
                        placeholder={t('club_nombre')}
                        />

                        <Input
                        value={b.teamName}
                        onChange={(e: any) => setBlock(i, 'teamName', e.target.value)}
                        label={t('equipo')}
                        placeholder={t('equipo_nombre')}
                        helpText={t('equipo_nombre_info')}
                        />

                        {i === 0 && (
                        <div>
                            <label className="text-sm font-medium block mb-1 text-gray-700">
                            {t('avatar')} <small>({t('avatar_temporada')})</small>
                            </label>
                            <label className="flex items-center justify-center border-2 border-dashed rounded-lg p-6 bg-white cursor-pointer hover:bg-gray-100">
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                const f = e.target.files?.[0] || null;
                                setBlock(i, 'avatarFile', f);
                                }}
                            />
                            <div className="text-center">
                                <div className="text-sm">
                                {b.avatarFile ? `Seleccionado: ${b.avatarFile.name}` : t('imagen_selec')}
                                </div>
                                <div className="text-xs text-gray-500">{t('imagenes_guarda_local')}</div>
                            </div>
                            </label>
                        </div>
                        )}
                    </div>
                    );
                })}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                    type="button"
                    onClick={addBlock}
                    disabled={!canAddMore(blocks.length)}
                    className={`h-12 w-full rounded-lg border text-sm font-medium ${canAddMore(blocks.length) ? 'bg-white hover:bg-gray-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                >
                    + {t('participacion_add')}
                </button>

                <Submit
                    text={t('guardar')}
                    loadingText={t('procesando') ?? t('guardar')}
                    disabled={busy}
                    className="h-12 w-full"
                />
                </div>
            </form>

            {busy && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-white/60 backdrop-blur-sm">
                <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                <span className="ml-3 text-sm font-medium text-gray-800">
                    {t('procesando') || 'Procesando...'}
                </span>
                </div>
            )}
        </div>
    );
}
