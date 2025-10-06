'use client';

import { useEffect, useMemo, useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { getCurrentSeasonId } from '@/lib/seasons';
import { useT } from '@/i18n/I18nProvider';

import Input from '@/components/Input';
import Select from '@/components/Select';
import Submit from '@/components/Submit';

type Props = {
  playerId: string;
  seasonIdFromQuery: string | null;
};

type Sport = { id: string; name: string; slug: string; active?: boolean | null };
type Category = { id: string; name: string; sport_id: string; gender?: 'masculino'|'femenino'|'mixto'|null };

export default function CompetitionNewForm({ playerId, seasonIdFromQuery }: Props) {
  const t = useT();
  const router = useRouter();

  // State
  const [seasonId, setSeasonId] = useState<string | null>(seasonIdFromQuery);
  const [sports, setSports] = useState<Sport[]>([]);
  const [categoriesBySport, setCategoriesBySport] = useState<Record<string, Category[]>>({});
  const [sportId, setSportId] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [competitionName, setCompetitionName] = useState('');
  const [clubName, setClubName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

    // Carga catálogos
    useEffect(() => {
    (async () => {
      const { data: sportsRaw, error: e1 } = await supabase
        .from('sports')
        .select('id, name, slug, active')
        .order('name', { ascending: true });
      if (e1) { setErr(e1.message); return; }
      setSports((sportsRaw || []).filter(s => (typeof s.active === 'boolean' ? s.active : true)));

      const { data: cats, error: e2 } = await supabase
        .from('sport_categories')
        .select('id, name, gender, sport_id')
        .order('name', { ascending: true })
        .order('gender', { ascending: true });
      if (e2) { setErr(e2.message); return; }

      const group: Record<string, Category[]> = {};
      (cats || []).forEach((c: any) => {
        group[c.sport_id] = group[c.sport_id] || [];
        group[c.sport_id].push(c as Category);
      });
      setCategoriesBySport(group);
    })();
    }, []);

    // Resolver temporada vigente si no vino en query
    useEffect(() => {
    if (seasonId) return;
    (async () => {
      try {
        const sId = await getCurrentSeasonId(supabase);
        setSeasonId(sId);
      } catch {
        setErr(t('temporada_no_definida') || 'No se pudo resolver la temporada actual.');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

  // UI helpers
  const seasonLabel = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const aug1 = new Date(y, 7, 1);
    return now >= aug1 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  }, []);

  const GENDER_ORDER: Record<'masculino'|'femenino'|'mixto', number> = { masculino: 0, femenino: 1, mixto: 2 };
  function labelWithGender(c: Category) {
    switch (c.gender) {
      case 'masculino': return `${c.name} (Masculino)`;
      case 'femenino':  return `${c.name} (Femenino)`;
      case 'mixto':
      default:          return `${c.name} (Mixto)`;
    }
  }

  // Submit
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setInfo(null);

    if (!seasonId) { setErr(t('temporada_no_definida') || 'Temporada no definida.'); return; }
    if (!sportId) { setErr(t('deporte_selec') || 'Selecciona un deporte.'); return; }
    // nombre de competición opcional, club/equipo opcionales

    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado.');

      // club
      let clubId: string | null = null;
      if (clubName.trim()) {
        const { data: club, error: clubErr } = await supabase
          .from('clubs')
          .upsert(
            { name: clubName.trim(), player_id: playerId },
            { onConflict: 'player_id,name' }
          )
          .select('id')
          .single();
        if (clubErr) throw clubErr;
        clubId = club!.id;
      }

      // team
      let teamId: string | null = null;
      if (teamName.trim()) {
        if (!clubId) throw new Error(t('equipo_necesita_club_aviso') || 'El equipo requiere un club.');
        const { data: teamUpsert, error: teamUpErr } = await supabase
          .from('teams')
          .upsert(
            { name: teamName.trim(), club_id: clubId, sport_id: sportId, player_id: playerId },
            { onConflict: 'player_id,club_id,sport_id,name' }
          )
          .select('id')
          .single();
        if (teamUpErr) throw teamUpErr;
        teamId = teamUpsert!.id;
      }

      // competition
      const payload = {
        player_id: playerId,
        season_id: seasonId,
        sport_id: sportId,
        club_id: clubId,
        team_id: teamId,
        category_id: categoryId ?? null,
        name: competitionName.trim() || null,
      };
      const { error: cmpErr } = await supabase.from('competitions').insert(payload);
      if (cmpErr) throw cmpErr;

      // listo
      setInfo(t('guardado_ok') || 'Guardado correctamente.');
      router.replace(`/players/${playerId}`);
    } catch (e: any) {
      setErr(e?.message || t('error_generico') || 'Error al guardar.');
    } finally {
      setBusy(false);
    }
  };

    const sportCats = sportId ? (categoriesBySport[sportId] || []) : [];

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-sm text-gray-600">
                {t('temporada')}: <b>{seasonLabel}</b>
            </p>

            {info && <div className="rounded border p-3 bg-green-50 text-green-700">{info}</div>}
            {err &&  <div className="rounded border p-3 bg-red-50 text-red-700">{err}</div>}

            <div>
                <label className="text-sm font-medium">{t('deporte')}</label>
                <Select
          name="sport"
          value={sportId}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
            setSportId(e.target.value);
            setCategoryId(null);
          }}
          options={sports.map(s => ({ value: s.id, label: s.name }))}
          placeholder={t('deporte_selec')}
          fontSize="sm"
        />
      </div>

      <div>
        <Input
          value={competitionName}
          onChange={(e: any) => setCompetitionName(e.target.value)}
          label={t('competicion')}
          placeholder={t('competicion_nombre')}
        />
      </div>

      <div>
        <Select
          name="categoryId"
          label={t('categoria')}
          value={categoryId ?? ''}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategoryId(e.target.value || null)}
          options={[...sportCats]
            .sort((a, b) => {
              if (a.name !== b.name) return a.name.localeCompare(b.name, 'es');
              const ga = a.gender ?? 'mixto';
              const gb = b.gender ?? 'mixto';
              return GENDER_ORDER[ga as keyof typeof GENDER_ORDER] - GENDER_ORDER[gb as keyof typeof GENDER_ORDER];
            })
            .map(c => ({ value: c.id, label: labelWithGender(c) }))}
          placeholder={sportCats.length === 0 ? t('deporte_selec_primero') : t('categoria_selec')}
          fontSize="sm"
        />
      </div>

      <Input
        value={clubName}
        onChange={(e: any) => setClubName(e.target.value)}
        label="Club"
        placeholder={t('club_nombre')}
      />

            <Input
                value={teamName}
                onChange={(e: any) => setTeamName(e.target.value)}
                label={t('equipo')}
                placeholder={t('equipo_nombre')}
                helpText={t('equipo_nombre_info')}
            />
            <br/>

            <div>
                <Submit
                    text={t('guardar')}
                    loadingText={t('procesando') ?? t('guardar')}
                    disabled={busy || !seasonId}
                    className="h-12 w-full"
                />
            </div>
        </form>
    );
}
