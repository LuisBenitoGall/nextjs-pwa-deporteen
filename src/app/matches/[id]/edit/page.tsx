'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabaseBrowser } from '../../../../lib/supabase/client';
import { useT } from '@/i18n/I18nProvider';

// Components 
import Input from '@/components/Input';
import Submit from '@/components/Submit';
import TitleH1 from '@/components/TitleH1';

type MatchRow = {
  id: string;
  competition_id: string;
  player_id: string;
  date_at: string;
  place: string | null;
  rival_team_name: string | null;
};

type Competition = { id: string; name: string; team_id: string | null };

export default function EditMatchMetaPage() {
  const t = useT();
  const { id: matchId } = useParams() as { id: string };
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [match, setMatch]           = useState<MatchRow | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);

  // Campos editables
  const [dateLocal, setDateLocal] = useState<string>(''); // datetime-local
  const [place, setPlace]         = useState<string>('');
  const [rival, setRival]         = useState<string>('');

  // Helpers fecha <-> datetime-local
  function isoToLocal(iso: string | null | undefined) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function localToIso(local: string) {
    if (!local) return null;
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

    useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);

      const { data: m, error: mErr } = await supabase
        .from('matches')
        .select('id, competition_id, player_id, date_at, place, rival_team_name')
        .eq('id', matchId)
        .single();

      if (!mounted) return;
      if (mErr) { setError(mErr.message); setLoading(false); return; }

      const mr = m as MatchRow;
      setMatch(mr);

      const { data: comp } = await supabase
        .from('competitions')
        .select('id, name, team_id')
        .eq('id', mr.competition_id)
        .maybeSingle();
      if (!mounted) return;
      setCompetition(comp as Competition || null);

      setDateLocal(isoToLocal(mr.date_at));
      setPlace(mr.place || '');
      setRival(mr.rival_team_name || '');

      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [supabase, matchId]);

    if (loading) return <div className="p-6">{t('cargando') || 'Cargando…'}</div>;
    if (error)   return <div className="p-6 text-red-600">{error}</div>;
    if (!match)  return <div className="p-6">{t('no_encontrado') || 'No encontrado'}</div>;

    // URLs navegación superior
    const backToMatchUrl = `/matches/${matchId}/live`;
    const backToListUrl  = `/players/${match.player_id}/competitions/${match.competition_id}/matches`;

    async function onSave() {
    const isoDate = localToIso(dateLocal);
    if (!isoDate) {
      setError(t('fecha_invalida') || 'Fecha inválida');
      return;
    }
    setError(null);

    const payload = {
      date_at: isoDate,
      place: place || null,
      rival_team_name: rival || null,
    };
        const res = await fetch(`/api/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        });
        if (!res.ok) {
        const { error: errMsg } = await res.json().catch(()=>({error:'Error'}));
        setError(errMsg || 'No se pudo guardar');
        return;
        }
        // volver al partido
        window.location.href = backToMatchUrl;
    }

    return (
        <div>
            {/* Oculta el footer aquí también */}
            <style jsx global>{`footer{display:none !important}`}</style>

            <TitleH1>{t('partido_editar') || 'Editar partido'}</TitleH1>

            <div className="flex items-center gap-2 mb-4">
                <a href={backToMatchUrl} className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg shadow transition">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{t('partido_volver') || 'Volver al partido'}</span>
                </a>
                
                <a href={backToListUrl} className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg shadow transition">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{t('competicion_volver') || 'Partidos de la competición'}</span>
                </a>
            </div>

            <div className="mt-4 grid gap-4">
                <div className="text-sm text-gray-600">
                    <b>{t('competicion') || 'Competición'}:</b> {competition?.name || match.competition_id}
                </div>

                <div className="grid gap-1">
                    <Input
                        label={t('fecha') || 'Fecha'}
                        type="datetime-local"
                        value={dateLocal}
                        onChange={(e:any) => setDateLocal(e.target.value)}
                    />
                </div>

                <Input label={t('lugar') || 'Lugar'} value={place} onChange={(e:any)=>setPlace(e.target.value)} />

                <Input label={t('rival') || 'Rival'} value={rival} onChange={(e:any)=>setRival(e.target.value)} />

                <div className="pt-2">
                    <Submit onClick={onSave as any} text={t('guardar') || 'Guardar'} loadingText={t('guardando') || 'Guardando…'} />
                </div>
            </div>
        </div>
    );
}
