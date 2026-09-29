// src/lib/sports/index.ts
export type SportIcon = { name: string; icon: string; slug: string; i18nKey: string };

export const SPORTS: SportIcon[] = [
  { name: 'Baloncesto',    icon: '/icons/icon-baloncesto.png',    slug: 'baloncesto',     i18nKey: 'baloncesto' },
  { name: 'Fútbol',        icon: '/icons/icon-futbol.png',        slug: 'futbol',         i18nKey: 'futbol' },
  { name: 'Fútbol Sala',   icon: '/icons/icon-futbol-sala.png',   slug: 'futbol-sala',    i18nKey: 'futbol_sala' },
  { name: 'Balonmano',     icon: '/icons/icon-balonmano.png',     slug: 'balonmano',      i18nKey: 'balonmano' },
  { name: 'Rugby',         icon: '/icons/icon-rugby.png',         slug: 'rugby',          i18nKey: 'rugby' },
  { name: 'Voleibol',      icon: '/icons/icon-voleibol.png',      slug: 'voleibol',       i18nKey: 'voleibol' },
  { name: 'Waterpolo',     icon: '/icons/icon-waterpolo.png',     slug: 'waterpolo',      i18nKey: 'waterpolo' },
  { name: 'Hockey Hierba', icon: '/icons/icon-hockey-hierba.png', slug: 'hockey-hierba',  i18nKey: 'hockey_hierba' },
  { name: 'Hockey Patines',icon: '/icons/icon-hockey-patines.png',slug: 'hockey-patines', i18nKey: 'hockey_patines' },
];

/**
 * Filas del catálogo con `active` nulo/ausente cuentan como activas; solo `false`
 * (deportes legacy desactivados en la reconciliación de slugs) queda fuera de los listados.
 */
export function isSportActive(sport: { active?: boolean | null }): boolean {
  return sport.active !== false;
}

/** Normaliza nombres a slug comparable (sin tildes, espacios→guiones, minúsculas) */
export function normalizeSlug(s?: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/** Devuelve el path del icono a partir del nombre del deporte (o null si no hay match). */
export function getSportIconPath(sportName?: string): string | null {
  const slug = normalizeSlug(sportName);
  if (!slug) return null;

  // match exacto de slug
  const bySlug = SPORTS.find(s => s.slug === slug);
  if (bySlug) return bySlug.icon;

  // fallback: coincide por nombre normalizado o el slug está incluido
  const byName = SPORTS.find(s =>
    normalizeSlug(s.name) === slug || slug.includes(s.slug)
  );
  return byName?.icon ?? null;
}
