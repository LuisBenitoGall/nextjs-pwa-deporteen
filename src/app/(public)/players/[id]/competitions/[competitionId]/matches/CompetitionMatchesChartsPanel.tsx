'use client';

import { useMemo } from 'react';
import { useT } from '@/i18n/I18nProvider';
import {
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type {
  CompetitionMatchRow,
  CompetitionMatchesSport,
} from '@/lib/competitions/loadCompetitionMatchesInitialData';

const WIN_COLOR = '#16a34a';
const LOSS_COLOR = '#dc2626';
const DRAW_COLOR = '#6b7280';
const PF_COLOR = WIN_COLOR;
const PC_COLOR = LOSS_COLOR;

function normalizeType(typeRaw: unknown): 'number' | 'text' | 'boolean' {
  const v = String(typeRaw || '').toLowerCase();
  if (v.includes('bool')) return 'boolean';
  if (v.includes('int') || v.includes('num') || v.includes('float')) return 'number';
  return 'text';
}

type Props = {
  matches: CompetitionMatchRow[];
  sport: CompetitionMatchesSport | null;
};

export default function CompetitionMatchesChartsPanel({ matches, sport }: Props) {
  const t = useT();

  const colorForWLD = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('gan')) return WIN_COLOR;
    if (n.includes('perd')) return LOSS_COLOR;
    return DRAW_COLOR;
  };

  const colorForPFPC = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('favor')) return PF_COLOR;
    if (n.includes('contra')) return PC_COLOR;
    return DRAW_COLOR;
  };

  const statDefs = useMemo(() => {
    const defs: Array<{ key: string; label: string; type: 'number' | 'text' | 'boolean' }> = [];
    const seen = new Set<string>();
    const schema = sport?.stats;

    const pushField = (field: Record<string, unknown>, fallbackKey?: string) => {
      const key =
        typeof fallbackKey === 'string' && fallbackKey.trim().length > 0
          ? fallbackKey
          : (field?.key as string) ?? (field?.name as string) ?? (field?.id as string);
      if (!key || seen.has(key)) return;
      seen.add(key);
      const label =
        typeof field?.label === 'string' && field.label.trim().length > 0 ? field.label : key;
      const type = normalizeType(field?.type);
      defs.push({ key, label, type });
    };

    if (schema) {
      const maybeFields = (schema as { fields?: unknown[] })?.fields;
      if (Array.isArray(maybeFields)) {
        for (const field of maybeFields) pushField(field as Record<string, unknown>);
      }
      if (Array.isArray(schema)) {
        for (const field of schema) pushField(field as Record<string, unknown>);
      } else if (typeof schema === 'object' && schema !== null) {
        for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
          if (key === 'fields') continue;
          pushField((value as Record<string, unknown>) ?? {}, key);
        }
      }
    }

    if (defs.length === 0) {
      for (const match of matches) {
        const stats = (match.stats as Record<string, unknown>) || {};
        for (const [key, value] of Object.entries(stats)) {
          if (typeof value === 'number' && Number.isFinite(value)) {
            pushField({ label: key, type: 'number' }, key);
          }
        }
      }
    }

    return defs;
  }, [matches, sport?.stats]);

  const numericStatDefs = statDefs.filter((def) => def.type === 'number');
  const statKeys = numericStatDefs.map((def) => def.key);

  const statSummaries = numericStatDefs.map((def) => {
    let total = 0;
    let count = 0;
    for (const match of matches) {
      const stats = (match.stats as Record<string, unknown>) || {};
      const value = stats?.[def.key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        total += value;
        count += 1;
      }
    }
    const average = count ? total / count : 0;
    return { ...def, total, count, average };
  });

  const formatNumber = (value: number) =>
    Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0';

  const formatLabel = (label: string) => label.replace(/_/g, ' ');

  const matchesPlayed = matches.length || 0;
  const pfTotal = matches.reduce((acc, m) => acc + Number(m.my_score ?? 0), 0);
  const pcTotal = matches.reduce((acc, m) => acc + Number(m.rival_score ?? 0), 0);
  const pfAvg = matchesPlayed ? +(pfTotal / matchesPlayed).toFixed(2) : 0;
  const pcAvg = matchesPlayed ? +(pcTotal / matchesPlayed).toFixed(2) : 0;

  let wins = 0;
  let losses = 0;
  let draws = 0;
  for (const m of matches) {
    const a = Number(m.my_score ?? 0);
    const b = Number(m.rival_score ?? 0);
    if (a > b) wins++;
    else if (a < b) losses++;
    else draws++;
  }

  const wldData = [
    { nombre: t('ganados') || 'Ganados', valor: wins },
    { nombre: t('empatados') || 'Empatados', valor: draws },
    { nombre: t('perdidos') || 'Perdidos', valor: losses },
  ];

  const pfpcData = [
    { nombre: t('a_favor') || 'A favor', valor: pfTotal },
    { nombre: t('en_contra') || 'En contra', valor: pcTotal },
  ];

  const scoringAliases = ['goles', 'gol', 'puntos', 'points', 'goals', 'tantos', 'anotaciones'];
  const scoringKey =
    statKeys.find((k) => scoringAliases.includes(k.toLowerCase())) || statKeys[0] || null;
  const scoringSummary = scoringKey
    ? (statSummaries.find((stat) => stat.key === scoringKey) ?? null)
    : null;
  const scoringLabel = scoringSummary?.label ?? scoringKey ?? '';
  const playerScoringTotal = scoringSummary?.total ?? 0;
  const playerScoringAverage = scoringSummary?.average ?? 0;
  const teamTotalForPie = pfTotal || 0;
  const otherTeam = Math.max(0, teamTotalForPie - playerScoringTotal);

  return (
    <div className="mt-8 py-6 bg-white text-sm text-gray-600 bg-green-700">
      <div>
        <h3 className="text-lg font-semibold mb-3">{t('equipo') || 'Equipo'}</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="rounded-xl border p-3">
            <div className="text-xs text-gray-600 text-center">{t('pf_total') || 'PF total'}</div>
            <div className="text-2xl font-semibold text-right">{pfTotal}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-gray-600 text-center">{t('pc_total') || 'PC total'}</div>
            <div className="text-2xl font-semibold text-right">{pcTotal}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-gray-600 text-center">{t('pf_promedio') || 'PF promedio'}</div>
            <div className="text-2xl font-semibold text-right">{pfAvg}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-gray-600 text-center">{t('pc_promedio') || 'PC promedio'}</div>
            <div className="text-2xl font-semibold text-right">{pcAvg}</div>
          </div>
        </div>

        <div className="h-60 w-full">
          <h4 className="mb-3 font-bold">{t('partidos_balance')}</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={wldData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="valor">
                {wldData.map((d, i) => (
                  <Cell key={`wld-${i}`} fill={colorForWLD(d.nombre)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="h-60 w-full mt-8 pt-8">
          <h4 className="mb-3 font-bold">{t('anotaciones_balance')}</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pfpcData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="valor">
                {pfpcData.map((d, i) => (
                  <Cell key={`pfpc-${i}`} fill={colorForPFPC(d.nombre)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">{t('jugador') || 'Jugador'}</h3>

          {statSummaries.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {statSummaries.map((summary) => (
                  <div
                    key={summary.key}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="text-sm font-semibold text-gray-700">
                      {formatLabel(summary.label)}
                    </div>
                    <div className="mt-1 flex items-end justify-between">
                      <span className="text-left leading-none">
                        <div className="text-xs text-gray-500 uppercase tracking-wide">
                          {t('total') || 'TOTAL'}
                        </div>
                        <div className="text-4xl font-semibold text-green-700">
                          {formatNumber(summary.total)}
                        </div>
                      </span>
                      <span className="text-right leading-none">
                        <div className="text-xs text-gray-500 uppercase tracking-wide">
                          {t('promedio') || 'PROMEDIO'}
                        </div>
                        <div className="text-3xl font-semibold text-gray-700">
                          {formatNumber(summary.average)}
                        </div>
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {(t('partidos') || 'Partidos')}: {summary.count}
                    </div>
                  </div>
                ))}
              </div>

              {scoringKey ? (
                <div className="mt-10">
                  <div className="text-sm mb-2 text-gray-600">
                    {(t('metrica') || 'Metrica')}: <b>{formatLabel(scoringLabel)}</b>
                    <span className="ml-2 text-xs text-gray-500">
                      {(t('promedio') || 'Promedio')}: {formatNumber(playerScoringAverage)}
                    </span>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip />
                        <Legend />
                        <Pie
                          data={[
                            { name: t('jugador') || 'Jugador', value: playerScoringTotal },
                            { name: t('equipo') || 'Equipo', value: otherTeam },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="55%"
                          outerRadius="80%"
                        >
                          <Cell fill={WIN_COLOR} />
                          <Cell fill="#c5c7cb" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-gray-600">
              {t('sin_estadisticas_detectadas') || 'No hay estadisticas numericas para mostrar.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
