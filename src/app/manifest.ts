import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DeporTeen',
    short_name: 'DeporTeen',
    description: 'Resultados y estadísticas de deportes de equipo para familias y clubs.',
    lang: 'es-ES',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    theme_color: '#0EA5E9',
    background_color: '#FFFFFF',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ],
    // Atajos PWA: panel/galería (#44) + partidos/deportista (#45)
    shortcuts: [
      {
        name: 'Mi panel',
        short_name: 'Panel',
        url: '/dashboard',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Mi galería',
        short_name: 'Galería',
        url: '/gallery',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Nuevo partido fútbol',
        short_name: 'Partido fútbol',
        url: '/matches/new',
        icons: [{ src: '/icons/icon-futbol-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Nuevo partido baloncesto',
        short_name: 'Partido basket',
        url: '/matches/new',
        icons: [{ src: '/icons/icon-baloncesto-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Nuevo deportista',
        short_name: 'Deportista',
        url: '/players/new',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  };
}
