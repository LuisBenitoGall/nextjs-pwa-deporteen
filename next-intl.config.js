export default {
  locales: ['es', 'en', 'ca'],
  defaultLocale: 'es',
  messages: {
    es: () => import('./src/messages/es.json'),
    en: () => import('./src/messages/en.json'),
    ca: () => import('./src/messages/ca.json')
  }
};
