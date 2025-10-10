// src/lib/sports/index.ts
export type SportIcon = { name: string; icon: string; slug: string };

export const SPORTS: SportIcon[] = [
  { name: 'Baloncesto',    icon: '/icons/icon-baloncesto.png',    slug: 'baloncesto' },
  { name: 'Fútbol',        icon: '/icons/icon-futbol.png',        slug: 'futbol' },
  { name: 'Fútbol Sala',   icon: '/icons/icon-futbol-sala.png',   slug: 'futbol-sala' },
  { name: 'Balonmano',     icon: '/icons/icon-balonmano.png',     slug: 'balonmano' },
  { name: 'Rugby',         icon: '/icons/icon-rugby.png',         slug: 'rugby' },
  { name: 'Voleibol',      icon: '/icons/icon-voleibol.png',      slug: 'voleibol' },
  { name: 'Waterpolo',     icon: '/icons/icon-waterpolo.png',     slug: 'waterpolo' },
  { name: 'Hockey Hierba', icon: '/icons/icon-hockey-hierba.png', slug: 'hockey-hierba' },
  { name: 'Hockey Patines',icon: '/icons/icon-hockey-patines.png',slug: 'hockey-patines' },
];

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
