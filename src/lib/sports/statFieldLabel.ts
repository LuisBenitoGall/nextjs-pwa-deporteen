export type TranslateFn = (key: string) => string;

/**
 * Mapeo de claves de `sports.stats.fields[].key` (catálogo en BD) a claves i18n.
 * Las etiquetas en BD están en español; en UI se resuelven con el locale activo.
 */
const SPORT_STAT_FIELD_I18N_KEYS: Record<string, string> = {
  goals: 'goles',
  assists: 'asistencias',
  points: 'puntos',
  minutes_played: 'minutos_jugados',
  yellow_cards: 'stat_yellow_cards',
  red_cards: 'stat_red_cards',
  green_cards: 'stat_green_cards',
  rebounds: 'stat_rebounds',
  steals: 'stat_steals',
  blocks: 'stat_blocks',
  saves: 'stat_saves',
  tries: 'stat_tries',
  conversions: 'stat_conversions',
  tackles: 'stat_tackles',
  aces: 'stat_aces',
  digs: 'stat_digs',
  exclusions: 'stat_exclusions',
  penalties: 'stat_penalties',
};

export function resolveSportStatFieldLabel(
  fieldKey: string,
  fallbackLabel: string | undefined,
  t: TranslateFn,
): string {
  const key = fieldKey.trim();
  if (!key) return fallbackLabel?.trim() || '';

  const i18nKey = SPORT_STAT_FIELD_I18N_KEYS[key] ?? `stat_${key}`;
  const translated = t(i18nKey)?.trim();
  if (translated) return translated;

  const trimmedFallback = fallbackLabel?.trim();
  if (trimmedFallback) return trimmedFallback;
  return key;
}
