'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import Link from 'next/link';
import { useT } from '@/i18n/I18nProvider';
import TitleH1 from '@/components/TitleH1';
import { LIMITS } from '@/config/constants';
import type { CompetitionMatchesInitialPayload } from '@/lib/competitions/loadCompetitionMatchesInitialData';

const CompetitionMatchesChartsPanel = dynamic(() => import('./CompetitionMatchesChartsPanel'), {
  loading: () => <div className="mt-8 py-6 text-sm text-gray-500">…</div>,
});

type Props = {
  playerId: string;
  initial: CompetitionMatchesInitialPayload;
  isActiveSubscription: boolean;
};

export default function MatchesByCompetitionView({
  playerId,
  initial,
  isActiveSubscription,
}: Props) {
  const t = useT();
  const [tab, setTab] = useState<'matches' | 'charts'>('matches');
  const { competition, matches, season, sport } = initial;

  const pageSize = LIMITS.MATCH_LIST_PAGE_SIZE;
  const [visibleCount, setVisibleCount] = useState<number>(pageSize);
  const visibleMatches = matches.slice(0, visibleCount);
  const listTruncated = matches.length > visibleCount;

  const seasonLabel =
    season?.year_start && season?.year_end ? `${season.year_start}-${season.year_end}` : null;

  return (
    <div>
      <TitleH1>
        {t('partidos_competicion') || 'Partidos'}: {competition.name}
        {seasonLabel ? <span className="text-gray-500"> {seasonLabel}</span> : null}
      </TitleH1>

      {listTruncated && tab === 'matches' && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t('match_list_truncated', { n: String(visibleMatches.length), total: String(matches.length) })
            || `Mostrando los primeros ${visibleMatches.length} de ${matches.length} partidos.`}
        </p>
      )}

      <div className="mb-6 flex gap-2 flex-wrap">
        <Link href={`/players/${playerId}`}>
          <button
            type="button"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg shadow transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 18L9 12L15 6"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{t('perfil_ver')}</span>
          </button>
        </Link>

        {isActiveSubscription && (
          <Link
            href={`/players/${playerId}/matches/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm text-white font-bold hover:bg-green-700"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            </svg>
            <span>{t('partido_nuevo')}</span>
          </Link>
        )}

        <button
          type="button"
          onClick={() => setTab('matches')}
          className={`font-semibold px-3 py-2 rounded-lg transition ${
            tab === 'matches'
              ? 'bg-green-600 hover:bg-green-700 text-white shadow'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm'
          }`}
        >
          {t('partidos')}
        </button>

        <button
          type="button"
          onClick={() => setTab('charts')}
          className={`font-semibold px-3 py-2 rounded-lg transition ${
            tab === 'charts'
              ? 'bg-green-600 hover:bg-green-700 text-white shadow'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm'
          }`}
        >
          {t('estadisticas')}
        </button>
      </div>

      {tab === 'matches' ? (
        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
          <div
            className="relative -mx-4 sm:mx-0 mt-4 overflow-x-auto md:overflow-visible px-4 sm:px-0 md:scroll-smooth"
            style={{
              WebkitOverflowScrolling: 'touch',
              WebkitMaskImage:
                'linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)',
            }}
          >
            <table className="min-w-[720px] md:min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left">{t('fecha') || 'Fecha'}</th>
                  <th className="px-3 py-2 text-left">{t('lugar') || 'Lugar'}</th>
                  <th className="px-3 py-2 text-left">{t('condicion') || 'Condición'}</th>
                  <th className="px-3 py-2 text-left">{t('rival') || 'Rival'}</th>
                  <th className="px-3 py-2 text-left">{t('marcador') || 'Marcador'}</th>
                  <th className="px-3 py-2 text-left">{t('acciones') || 'Acciones'}</th>
                </tr>
              </thead>
              <tbody>
                {matches.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                      {t('sin_partidos') || 'No hay partidos para esta competición y temporada.'}
                    </td>
                  </tr>
                )}
                {visibleMatches.map((m) => {
                  const rival = m.rival_team_name || t('equipo_rival') || 'Rival';
                  const myGoals = Number(m.my_score ?? 0);
                  const rivalGoals = Number(m.rival_score ?? 0);
                  const outcome =
                    myGoals > rivalGoals ? 'win' : myGoals < rivalGoals ? 'loss' : 'draw';
                  const homeScore = m.is_home ? myGoals : rivalGoals;
                  const awayScore = m.is_home ? rivalGoals : myGoals;
                  const score = `${homeScore} - ${awayScore}`;
                  const scoreClass =
                    outcome === 'win'
                      ? 'text-green-600'
                      : outcome === 'loss'
                        ? 'text-red-600'
                        : 'text-gray-600';

                  return (
                    <tr key={m.id} className="border-t">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {new Date(m.date_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">{m.place || '—'}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${m.is_home ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}
                        >
                          {m.is_home ? t('local') || 'Local' : t('visitante') || 'Visitante'}
                        </span>
                      </td>
                      <td className="px-3 py-2">{rival}</td>
                      <td className="px-3 py-2 font-semibold">
                        <span className={scoreClass}>{score}</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <a
                          href={`/matches/${m.id}/live`}
                          className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 ml-2 whitespace-nowrap"
                        >
                          {t('partido_ver') || 'Ver partido'}
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {listTruncated && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
                onClick={() => setVisibleCount((c) => Math.min(c + pageSize, matches.length))}
              >
                {t('match_list_load_more', {
                  shown: String(visibleMatches.length),
                  total: String(matches.length),
                })}
              </button>
            </div>
          )}
        </section>
      ) : (
        <CompetitionMatchesChartsPanel matches={matches} sport={sport} />
      )}
    </div>
  );
}
