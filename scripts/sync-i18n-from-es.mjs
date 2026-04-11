/**
 * Sincroniza en.json y ca.json con las claves de es.json (referencia).
 * - Mantiene valores existentes cuando la clave existe en el locale.
 * - Rellena claves nuevas con el mapa T (en/ca) o con el texto ES (último recurso).
 * - Bloque legal: scripts/data/legal-full-en.json y legal-full-ca.json (misma estructura que es).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const messagesDir = path.join(root, 'src', 'i18n', 'messages');
const dataDir = path.join(__dirname, 'data');

const es = JSON.parse(fs.readFileSync(path.join(messagesDir, 'es.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(messagesDir, 'en.json'), 'utf8'));
const ca = JSON.parse(fs.readFileSync(path.join(messagesDir, 'ca.json'), 'utf8'));

const LEGAL_EN_FULL = JSON.parse(fs.readFileSync(path.join(dataDir, 'legal-full-en.json'), 'utf8'));
const LEGAL_CA_FULL = JSON.parse(fs.readFileSync(path.join(dataDir, 'legal-full-ca.json'), 'utf8'));

function buildLegal(lang) {
  const table = lang === 'en' ? LEGAL_EN_FULL : LEGAL_CA_FULL;
  const out = {};
  for (const docKey of Object.keys(es.legal)) {
    const expected = es.legal[docKey]?.sections?.length;
    const rows = table[docKey];
    if (!rows || rows.length !== expected) {
      console.warn(`sync-i18n: legal.${docKey} (${lang}) length mismatch (es=${expected}, file=${rows?.length}); using es.`);
      out[docKey] = es.legal[docKey];
    } else {
      out[docKey] = { sections: rows };
    }
  }
  return out;
}

/** Traducciones para claves planas y legal (sufijo .en / .ca en claves legal.*) */
const T = {
  // ——— Flat EN (solo donde faltaba en en.json) ———
  a_favor: { en: 'For', ca: 'A favor' },
  acceso_para_siempre: { en: 'Lifetime access', ca: 'Accés per sempre' },
  aceptar_todo: { en: 'Accept all', ca: 'Acceptar tot' },
  analitica: { en: 'Analytics', ca: 'Analítica' },
  anotaciones_balance: { en: 'Scoring balance', ca: 'Balanç d\'anotacions' },
  any: { en: 'Year', ca: 'Any' },
  aviso_legal: { en: 'Legal notice', ca: 'Avís legal' },
  borrado_confirmar: { en: 'Confirm deletion', ca: 'Confirmar eliminació' },
  competicion_eliminar_confirmar: { en: 'Confirm competition deletion', ca: 'Confirmar eliminació de competició' },
  competicion_eliminar_confirmar_texto: {
    en: 'Confirm you want to delete this competition. All data will be lost. This action is irreversible.',
    ca: 'Confirma que vols eliminar aquesta competició. Es perdran totes les dades. Aquesta acció és irreversible.',
  },
  competicion_nueva: { en: 'New competition', ca: 'Nova competició' },
  competicion_volver: { en: 'Back to competition', ca: 'Tornar a la competició' },
  comprobando_sesion: { en: 'Checking session…', ca: 'Comprovant sessió…' },
  configurar: { en: 'Configure', ca: 'Configurar' },
  contacta: { en: 'Contact', ca: 'Contacta' },
  contacta_nuevo_deporte: {
    en: 'contact us if you would like another sport added.',
    ca: 'amb nosaltres si t\'agradaria incloure un altre esport.',
  },
  cookies_aceptacion_texto: {
    en: 'We use cookies for essential purposes, analytics, features and marketing. You can reject all except necessary ones, or configure them.',
    ca: 'Utilitzem galetes per a finalitats essencials, analítica, funcions i màrqueting. Pots rebutjar-les totes excepte les necessàries o configurar-les.',
  },
  cookies_analitica_texto: {
    en: 'Usage measurement. Requires consent unless exempt AEPD mode.',
    ca: 'Mesura d\'ús. Requereix consentiment excepte mode exent AEPD.',
  },
  cookies_funcionales_texto: {
    en: 'Non-essential service improvements.',
    ca: 'Millores no essencials del servei.',
  },
  cookies_marketing_texto: { en: 'Advertising and profiling.', ca: 'Publicitat i perfils.' },
  cookies_necesarias_texto: {
    en: 'Required for basic operation. Always active.',
    ca: 'Per al funcionament bàsic. Sempre actives.',
  },
  cookies_preferencias: { en: 'Cookie preferences', ca: 'Preferències de galetes' },
  deportista_no_encontrado: { en: 'Athlete not found', ca: 'Esportista no trobat' },
  deportista_no_encontrado_mensaje: {
    en: 'There is no information in the system about this athlete.',
    ca: 'No hi ha informació al sistema sobre aquest esportista.',
  },
  derechos_reservados: { en: 'All rights reserved.', ca: 'Tots els drets reservats.' },
  dias: { en: 'days', ca: 'dies' },
  duracion: { en: 'Duration', ca: 'Durada' },
  en_contra: { en: 'Against', ca: 'En contra' },
  enviar_enlace: { en: 'Send link', ca: 'Enviar enllaç' },
  foto: { en: 'Photo', ca: 'Foto' },
  funcionales: { en: 'Functional', ca: 'Funcionals' },
  galeria_aviso: {
    en: 'Remember that images and videos are stored on the device you used to capture or link them. In the gallery you will only see media stored on the device you are using.',
    ca: 'Recorda que les imatges i els vídeos s\'emmagatzemen al dispositiu des del qual has fet la captura o la vinculació. A la galeria només veuràs el que hi ha en aquest dispositiu.',
  },
  galeria_vacia: { en: 'There are no images or videos for this match.', ca: 'No hi ha imatges ni vídeos d\'aquest partit.' },
  gestionar_en_stripe: { en: 'Manage in Stripe', ca: 'Gestionar a Stripe' },
  guardando_archivo: { en: 'Saving file...', ca: 'Guardant fitxer...' },
  guardando_dispositivo: { en: 'Saving on device...', ca: 'Guardant al dispositiu...' },
  guardando_foto: { en: 'Saving photo...', ca: 'Guardant foto...' },
  guardando_video: { en: 'Saving video...', ca: 'Guardant vídeo...' },
  hecho: { en: 'Done ✔', ca: 'Fet ✔' },
  home_deportes_texto: {
    en: 'Record the sports history of these sports',
    ca: 'Registra l\'historial esportiu d\'aquests esports',
  },
  home_feature1_title: { en: 'Athlete management', ca: 'Gestió d\'esportistes' },
  home_feature1_text: {
    en: 'Register and track the sports history of your favourite players.',
    ca: 'Registra i fes el seguiment de l\'historial esportiu dels teus jugadors preferits.',
  },
  home_feature2_title: { en: 'Multiple sports', ca: 'Múltiples esports' },
  home_feature2_text: {
    en: 'Basketball, football, futsal, handball, volleyball, rugby, water polo, roller hockey and field hockey',
    ca: 'Bàsquet, futbol, futbol sala, handbol, voleibol, rugbi, waterpolo, hoquei patins i hoquei herba',
  },
  home_feature3_title: { en: 'Detailed statistics', ca: 'Estadístiques detallades' },
  home_feature3_text: {
    en: 'Analyse performance each match and season. Full history of wins, losses, points scored, goals,...',
    ca: 'Analitza el rendiment de cada partit i temporada. Històric de victòries, derrotes, punts, gols,...',
  },
  home_feature4_title: { en: 'Photos and videos', ca: 'Fotos i vídeos' },
  home_feature4_text: {
    en: 'Capture and store the best moments of every match to remember them forever.',
    ca: 'Captura i emmagatzema els millors moments de cada partit per recordar-los sempre.',
  },
  home_feature5_title: { en: 'Works offline', ca: 'Funciona sense connexió' },
  home_feature5_text: {
    en: 'Record data even without internet and sync automatically when you are back online.',
    ca: 'Registra dades fins i tot sense internet i sincronitza automàticament quan recuperis la connexió.',
  },
  home_feature6_title: { en: 'Mobile PWA', ca: 'PWA mòbil' },
  home_feature6_text: {
    en: 'You do not need to download an app from any store. Use it from your browser.',
    ca: 'No cal descarregar cap app des de cap botiga. La fas servir des del navegador.',
  },
  home_main_text1: {
    en: 'Looking for an app to save match stats for you or your kids? With Deporteen you can keep goals, points, assists, minutes played,... match by match, and add photos and videos. A memory for life.',
    ca: 'Buscaves una app per guardar les estadístiques dels teus partits o dels dels teus fills? Amb Deporteen pots guardar per sempre gols, punts, assistències, minuts jugats,... partit a partit i afegir-hi fotos i vídeos. Un record per a tota la vida.',
  },
  hora: { en: 'Time', ca: 'Hora' },
  jugador_eliminar_confirmar: { en: 'Confirm player deletion', ca: 'Confirmar eliminació del jugador' },
  jugador_eliminar_confirmar_texto: {
    en: 'Confirm you want to delete this player. All data for this player will be removed. This action is irreversible.',
    ca: 'Confirma que vols eliminar aquest jugador. Se n\'eliminaran totes les dades. Aquesta acció és irreversible.',
  },
  legal_: { en: 'Legal', ca: 'Legal' },
  mantener_pantalla: { en: 'Keep screen on', ca: 'Mantenir pantalla activa' },
  marketing: { en: 'Marketing', ca: 'Màrqueting' },
  media_eliminar_confirmar: { en: 'Confirm file deletion', ca: 'Confirmar eliminació de fitxer' },
  media_eliminar_confirmar_texto: { en: 'Confirm you want to delete this file', ca: 'Confirma que vols eliminar aquest fitxer' },
  menu: { en: 'Menu', ca: 'Menú' },
  metrica: { en: 'Metric', ca: 'Mètrica' },
  necesarias: { en: 'Necessary', ca: 'Necessàries' },
  no_cierres_app: {
    en: 'Do not close the app or lock the screen.',
    ca: 'No tanquis l\'aplicació ni bloquegis la pantalla.',
  },
  olvide_contrasena: { en: 'Forgot your password?', ca: 'Has oblidat la contrasenya?' },
  pago_cancelado: { en: 'Payment was cancelled.', ca: 'S\'ha cancel·lat el pagament.' },
  pago_completado: {
    en: 'Payment completed successfully and your subscription has been activated.',
    ca: 'El pagament s\'ha completat correctament i la teva subscripció s\'ha activat.',
  },
  partido_editar: { en: 'Edit match', ca: 'Editar partit' },
  partido_volver: { en: 'Back to match', ca: 'Tornar al partit' },
  partidos_balance: { en: 'Match record', ca: 'Balanç de partits' },
  pc_promedio: { en: 'Avg. points against', ca: 'Mitjana punts en contra' },
  pc_total: { en: 'Points against', ca: 'Punts en contra' },
  pf_promedio: { en: 'Avg. points for', ca: 'Mitjana punts a favor' },
  pf_total: { en: 'Points for', ca: 'Punts a favor' },
  plan_anual: { en: 'Annual plan', ca: 'Pla anual' },
  plan_siempre: { en: 'Lifetime plan', ca: 'Pla per sempre' },
  plan_trianual: { en: '3-year plan', ca: 'Pla 3 anys' },
  procesando_metadatos: { en: 'Processing metadata...', ca: 'Processant metadades...' },
  rechazar_todo: { en: 'Reject all', ca: 'Rebutjar tot' },
  recuerda_guardar_cambios: { en: 'Remember to save your changes.', ca: 'Recorda guardar els canvis.' },
  recuperacion_enviada: {
    en: 'We have sent a password recovery email. If it is not in your inbox, check spam.',
    ca: 'T\'hem enviat un correu per recuperar la contrasenya. Si no és a la safata d\'entrada, mira el correu brossa.',
  },
  recuperar_contrasena: { en: 'Reset password', ca: 'Recuperar contrasenya' },
  registrando_galeria: { en: 'Adding to gallery', ca: 'Registrant a la galeria' },
  renovacion_proxima_texto: {
    en: 'Your subscription will renew soon; you can renew from here.',
    ca: 'En les pròximes dates venç la teva subscripció; pots accedir des d\'aquí per renovar-la.',
  },
  renovacion_proxima_titulo: {
    en: 'Upcoming subscription renewal',
    ca: 'Propera renovació de la teva subscripció',
  },
  sin_asientos_disponibles: { en: 'No seats available.', ca: 'No hi ha seients disponibles.' },
  sin_competiciones_actuales: {
    en: 'There is no competition registered at the moment.',
    ca: 'No hi ha cap competició registrada actualment.',
  },
  sin_estadisticas_detectadas: { en: 'No statistics detected.', ca: 'No s\'han detectat estadístiques.' },
  sin_partidos: { en: 'No matches recorded', ca: 'No hi ha partits registrats' },
  sin_preview: {
    en: 'File not found. It may be saved on another of your devices.',
    ca: 'No s\'ha trobat el fitxer. Potser està guardat en un altre dels teus dispositius.',
  },
  stripe_pago_seguro: { en: 'Secure payment with Stripe', ca: 'Pagament segur amb Stripe' },
  stripe_admin: { en: 'Administration', ca: 'Administració' },
  stripe_admin_menu: { en: 'Stripe administration', ca: 'Administració Stripe' },
  stripe_admin_manage: { en: 'Manage Stripe', ca: 'Gestionar Stripe' },
  stripe_admin_dashboard: { en: 'Overview', ca: 'Panell general' },
  stripe_coupons_create_dialog_description: {
    en: 'Create a new coupon for your customers',
    ca: 'Crea un nou cupó per als teus clients',
  },
  stripe_coupons_create_coupon_description: { en: 'Description', ca: 'Descripció' },
  stripe_coupons_create_description: {
    en: 'Create a new coupon for your customers',
    ca: 'Crea un nou cupó per als teus clients',
  },
  suscripcion_ampliar: { en: 'Extend subscription', ca: 'Ampliar subscripció' },
  suscripcion_inactiva_titulo: {
    en: 'You do not have an active subscription at the moment.',
    ca: 'No tens cap subscripció activa en aquests moments.',
  },
  suscripcion_inactiva_texto: {
    en: 'You must renew your subscription to add new matches, and extend it to add new athletes.',
    ca: 'Has de renovar la teva subscripció per poder afegir nous partits, i ampliar-la per incloure nous esportistes.',
  },
  suscripcion_planes_texto: {
    en: 'All subscription plans include: <br> · Unlimited access to all recorded history. <br> · Export history to .xls. <br> · Images and videos are stored on your own device. <br> · 14-day period to request a refund.',
    ca: 'Tots els plans de subscripció inclouen: <br> · Accés il·limitat a tot l\'historial registrat. <br> · Exportació de l\'historial a .xls. <br> · Les imatges i els vídeos es guarden al propi dispositiu. <br> · Període de 14 dies per sol·licitar reemborsament.',
  },
  suscripcion_renovar: { en: 'Renew subscription', ca: 'Renovar subscripció' },
  suscripcion_renovar_texto: {
    en: 'Choose one of our plans to renew your subscription.',
    ca: 'Selecciona algun dels nostres plans per renovar la teva subscripció.',
  },
  suscripciones_no_registradas: {
    en: 'You have no subscriptions at the moment.',
    ca: 'No tens cap subscripció en aquest moment.',
  },
  telf: { en: 'Phone', ca: 'Telèfon' },
  temporada: { en: 'Season', ca: 'Temporada' },
  temporada_actual: { en: 'Current season', ca: 'Temporada actual' },
  temporada_selec: { en: 'Select a season', ca: 'Selecciona una temporada' },
  temporadas: { en: 'Seasons', ca: 'Temporades' },
  terminos_condiciones: { en: 'Terms and conditions', ca: 'Termes i condicions' },
  total: { en: 'Total', ca: 'Total' },
  valor: { en: 'Value', ca: 'Valor' },
  video: { en: 'Video', ca: 'Vídeo' },
};

function buildFlatMessages(esRoot, existing, lang) {
  const out = {};
  for (const k of Object.keys(esRoot)) {
    if (k === 'legal') continue;
    const ev = esRoot[k];
    if (typeof ev !== 'string') continue;
    if (existing[k] !== undefined && existing[k] !== '') {
      out[k] = existing[k];
      continue;
    }
    const tr = T[k];
    if (tr) out[k] = tr[lang] ?? tr.en ?? ev;
    else out[k] = ev;
  }
  return out;
}

function sortTopLevelKeys(obj, refOrder) {
  const ordered = {};
  for (const k of refOrder) {
    if (k in obj) ordered[k] = obj[k];
  }
  return ordered;
}

const refOrder = Object.keys(es);

const outEnFlat = buildFlatMessages(es, en, 'en');
const outCaFlat = buildFlatMessages(es, ca, 'ca');

const outEn = sortTopLevelKeys({ ...outEnFlat, legal: buildLegal('en') }, refOrder);
const outCa = sortTopLevelKeys({ ...outCaFlat, legal: buildLegal('ca') }, refOrder);

fs.writeFileSync(path.join(messagesDir, 'en.json'), `${JSON.stringify(outEn, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(messagesDir, 'ca.json'), `${JSON.stringify(outCa, null, 2)}\n`, 'utf8');

console.log('Updated en.json and ca.json from es.json reference.');
