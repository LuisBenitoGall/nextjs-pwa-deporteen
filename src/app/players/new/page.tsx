'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, ChangeEvent } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { supabase } from '@/lib/supabase/client';
import { getCurrentSeasonId } from '@/lib/seasons';
import { useT, useLocale } from '@/i18n/I18nProvider';

// Components
import Checkbox from '../../../components/Checkbox';
import Input from '../../../components/Input';
import Select from '../../../components/Select';
import Submit from '../../../components/Submit';
import TitleH1 from '../../../components/TitleH1';

type Sport = { id: string; name: string; slug: string; active?: boolean | null };
type Category = { id: string; name: string; sport_id: string };

type MembershipBlock = {
    sportId: string;
    clubName: string;
    teamName: string;
    categoryIds: string[];
    avatarFile?: File | null;
    avatarPath?: string | null; // ruta local calculada
};

export default function NewPlayerPage() {
    const t = useT();
    const router = useRouter();
    const params = useSearchParams();
    const supabase = useMemo(() => createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!, 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), []);

    const total = Math.max(1, parseInt(params.get('units') || '1', 10));
    const [created, setCreated] = useState(0);
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [sports, setSports] = useState<Sport[]>([]);
    const [categoriesBySport, setCategoriesBySport] = useState<Record<string, Category[]>>({});
    const [blocks, setBlocks] = useState<MembershipBlock[]>([
        { sportId: '', clubName: '', teamName: '', categoryIds: [], avatarFile: null, avatarPath: null },
    ]);
    const codeFromUrl = params.get('code') || '';
    const [pendingCode, setPendingCode] = useState<string>('');

    // ---------- helpers de temporada ----------
    function currentSeasonKeyFor(date: Date) {
        const y = date.getFullYear();
        const aug1 = new Date(y, 7, 1); // 1 agosto
        if (date >= aug1) return `${y}-${y + 1}`;
        return `${y - 1}-${y}`;
    }

    // ---------- cargar catálogo ----------
    useEffect(() => {
        (async () => {
            // deportes (si hay columna active, filtra; si no, trae todos)
            const { data: sportsRaw, error: e1 } = await supabase
                .from('sports')
                .select('id, name, slug, active')
                .order('name', { ascending: true });
            if (e1) { setErr(e1.message); return; }

            const activeOnly = (sportsRaw || []).filter((s: any) =>
                typeof s.active === 'boolean' ? s.active : true
            );
            setSports(activeOnly as Sport[]);

            // categorías por deporte
            const { data: cats, error: e2 } = await supabase
            .from('sport_categories')
            .select('id, name, sport_id')
            .order('name', { ascending: true });
            if (e2) { setErr(e2.message); return; }

            const group: Record<string, Category[]> = {};
            (cats || []).forEach((c: any) => {
                group[c.sport_id] = group[c.sport_id] || [];
                group[c.sport_id].push(c as Category);
            });
            setCategoriesBySport(group);

            // código pendiente
            const code = codeFromUrl || sessionStorage.getItem('pending_access_code') || localStorage.getItem('pending_access_code') || '';
            setPendingCode(code);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---------- UI handlers de bloques ----------
    const addBlock = () => {
        setBlocks((b) => [...b, { sportId: '', clubName: '', teamName: '', categoryIds: [], avatarFile: null, avatarPath: null }]);
    };
    const removeBlock = (idx: number) => {
        setBlocks((b) => b.filter((_, i) => i !== idx));
    };
    const setBlock = <K extends keyof MembershipBlock>(i: number, key: K, value: MembershipBlock[K]) => {
        setBlocks((prev) => {
            const copy = [...prev];
            copy[i] = { ...copy[i], [key]: value };
            return copy;
        });
    };

    // ---------- Almacenamiento local del avatar ----------
    async function saveAvatarLocally(file: File, playerId: string, seasonId: string) {
        // Intento con File System Access API
        try {
            // pide guardar con nombre sugerido
            // @ts-ignore
            if (window.showSaveFilePicker) {
                // @ts-ignore
                const handle = await window.showSaveFilePicker({
                    suggestedName: `${playerId}-${seasonId}-${file.name}`,
                    types: [{ description: 'Imagen', accept: { [file.type || 'image/*']: ['.jpg', '.jpeg', '.png', '.webp'] } }],
                });
                const writable = await handle.createWritable();
                await writable.write(await file.arrayBuffer());
                await writable.close();
                // Ruta lógica local que guardamos en BD (no revelamos el handle real)
                return `fsapi://${handle.name}`;
            }
        } catch {
            // si falla, seguimos a fallback
        }

        // Fallback: ruta lógica sin persistir el binario (tú decidirás luego dónde escribirlo)
        return `local://avatars/${playerId}/${seasonId}/${encodeURIComponent(file.name)}`;
    }

    // ---------- crear jugador + memberships + canjear código ----------
    const createOne = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);
        setInfo(null);

        if (!name.trim()) { setErr('Introduce un nombre.'); return; }

        // validar bloques mínimos
        for (let i = 0; i < blocks.length; i++) {
          const b = blocks[i];
          if (!b.sportId) return setErr(`Selecciona el deporte en el bloque ${i + 1}.`);
          // club/equipo pueden ir vacíos si aún no los tienes; no bloqueo
        }

        setBusy(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No autenticado.');

            // temporada vigente
            const seasonId = await getCurrentSeasonId(supabase);

            // 1) crear jugador
            const { data: p, error: insErr } = await supabase
                .from('players')
                .insert({ name })
                .select('id')
                .single();
            if (insErr) throw insErr;
            const playerId = p!.id as string;

            // 2) por cada bloque: upsert club, upsert team, insertar player_seasons (o player_memberships si tu tabla se llama así)
            for (const b of blocks) {
                let clubId: string | null = null;
                if (b.clubName.trim()) {
                  const { data: club, error: clubErr } = await supabase
                    .from('clubs')
                    .upsert({ name: b.clubName.trim() }, { onConflict: 'name' })
                    .select('id')
                    .single();
                    if (clubErr) throw clubErr;
                    clubId = club!.id;
                }

                let teamId: string | null = null;
                if (b.teamName.trim()) {
                    if (!clubId) {
                        // si no hay club, no podemos crear team coherente
                        throw new Error('Para crear un equipo necesitas indicar primero el club.');
                    }
                    const { data: team, error: teamErr } = await supabase
                    .from('teams')
                    .insert({ name: b.teamName.trim(), club_id: clubId, sport_id: b.sportId })
                    .select('id')
                    .single();
                  if (teamErr && teamErr.code !== '23505') { // por si ya existía
                    throw teamErr;
                  }
                  if (!team) {
                    // intenta seleccionar si ya existía
                    const { data: team2, error: t2 } = await supabase
                      .from('teams')
                      .select('id')
                      .eq('name', b.teamName.trim())
                      .eq('club_id', clubId)
                      .eq('sport_id', b.sportId)
                      .maybeSingle();
                    if (t2) throw t2;
                    teamId = team2?.id || null;
                  } else {
                    teamId = team.id;
                  }
            }

            // 3) avatar: guardar localmente y obtener ruta
            let avatarPath: string | null = null;
            if (b.avatarFile) {
                avatarPath = await saveAvatarLocally(b.avatarFile, playerId, seasonId);
            }

            // 4) insertar pertenencia por temporada
            // Nota: si tu tabla real es player_memberships (según nuestros scripts), cambia aquí el nombre.
            const { error: memErr } = await supabase.from('player_seasons').insert({
                user_id: user.id,
                player_id: playerId,
                season_id: seasonId,
                sport_id: b.sportId,
                club_id: clubId,
                team_id: teamId,
                category_ids: b.categoryIds,
                season_avatar_path: avatarPath,
            });
            if (memErr) throw memErr;
        }

        // 5) canjear código si viene de la suscripción (solo 1 jugador)
        if (pendingCode) {
        const { data, error: rpcErr } = await supabase.rpc('redeem_access_code_for_player', {
          p_code: pendingCode,
          p_user_id: (await supabase.auth.getUser()).data.user!.id,
          p_player_id: playerId,
        });
        if (rpcErr) throw rpcErr;
        if (!data?.ok) {
          setInfo(null);
          setErr(data?.message || 'No se pudo canjear el código.');
        } else {
          try {
            sessionStorage.removeItem('pending_access_code');
            localStorage.removeItem('pending_access_code');
            } catch {}
                    setInfo(`Acceso activado hasta ${new Date(data.ends_at).toLocaleDateString()}.`);
                }
            }

        // 6) siguiente o fin
        setCreated((c) => c + 1);
        setName('');
        setBlocks([{ sportId: '', clubName: '', teamName: '', categoryIds: [], avatarFile: null, avatarPath: null }]);

        if (created + 1 >= total) {
            router.replace(`/players/${playerId}`); // te llevo al último creado
        }
        } catch (e: any) {
            setErr(e?.message ?? 'Error al crear deportista.');
        } finally {
            setBusy(false);
        }
    };

    const remaining = total - created;

    return (
        <div className="max-w-xl mx-auto">
            <TitleH1>{t('deportista_nuevo')}</TitleH1>

            {/* 1) Notificación de pendientes */}
            <div className="mt-2 mb-4 rounded border p-3 bg-blue-50 text-blue-900 text-sm">
                {t('player_nuevo_texto1')}: <b>{remaining}</b>.
            </div>

            {/* Info/errores */}
            {info && <div className="rounded border p-3 bg-green-50 text-green-700 mb-4">{info}</div>}
            {err && <div className="rounded border p-3 bg-red-50 text-red-700 mb-4">{err}</div>}
    
            <form onSubmit={createOne} className="space-y-4">
                <Input 
                    value={name} 
                    onChange={(e:any)=>setName(e.target.value)} 
                    label={t('deportista_nombre')}
                    placeholder={t('nombre')} 
                />

                <p>{t('player_nuevo_texto2')}</p>

                {/* 2–7) Bloques replicables */}
                <div className="space-y-6">
                    {blocks.map((b, i) => {
                        const sportCats = b.sportId ? categoriesBySport[b.sportId] || [] : [];
                        return (
                            <div key={i} className="p-4 bg-gray-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="font-medium">{t('participacion')} #{i + 1}</div>
                                    {blocks.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => removeBlock(i)}
                                          className="text-sm text-red-600 hover:underline"
                                        >
                                            {t('eliminar')}
                                        </button>
                                    )}
                                </div>

                                {/* Deporte */}
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

                                {/* Categoría */}
                                <div>
                                    <Select
                                        name={`categoryIds_${i}`}
                                        label={t('categoria')}
                                        value={b.categoryIds}
                                        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                                            setBlock(
                                                i,
                                                'categoryIds',
                                                Array.from(e.target.selectedOptions).map((o) => o.value)
                                            )
                                        }
                                        options={sportCats.map((c) => ({ value: c.id, label: c.name }))}
                                        placeholder={sportCats.length === 0 ? t('deporte_selec_primero') : t('categoria_selec') }
                                        fontSize="sm"
                                    />
                                </div>

                                {/* Club */}
                                <Input
                                    value={b.clubName}
                                    onChange={(e: any) => setBlock(i, 'clubName', e.target.value)}
                                    label="Club"
                                    placeholder={t('club_nombre')}
                                />

                                {/* Equipo */}
                                <Input
                                    value={b.teamName}
                                    onChange={(e: any) => setBlock(i, 'teamName', e.target.value)}
                                    label={t('equipo')}
                                    placeholder={t('equipo_nombre')}
                                />

                                {/* 2) Avatar por temporada */}
                                <div>
                                    <label className="text-sm font-medium block mb-1 text-gray-700">{t('avatar')} <small>({t('avatar_temporada')})</small></label>
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
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={addBlock}
                        className="px-3 py-2 rounded bg-white border hover:bg-gray-50 text-sm"
                    >
                        + {t('participacion_add')}
                    </button>

                    <Submit
                        text={t('guardar')}
                        loadingText={t('procesando') ?? t('guardar')}
                        disabled={busy}
                    />
                </div>
            </form>
        </div>
    );
}
