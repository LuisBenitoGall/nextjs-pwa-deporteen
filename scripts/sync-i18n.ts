#!/usr/bin/env tsx
/**
 * Script de sincronización de traducciones
 * 
 * Sincroniza la estructura de todos los archivos de traducción con es.json (idioma base)
 * y traduce automáticamente los valores faltantes o nuevos.
 * 
 * Uso: pnpm i18n:sync
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { translate } from '@vitalets/google-translate-api';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale } from '../src/i18n/config';

const MESSAGES_DIR = join(process.cwd(), 'src/i18n/messages');
const BASE_LOCALE: Locale = DEFAULT_LOCALE; // 'es'

// Mapeo de códigos de idioma para Google Translate (ISO 639-1 / códigos que acepta la API)
const LOCALE_MAP: Record<Locale, string> = {
  es: 'es',
  en: 'en',
  ca: 'ca',
  it: 'it',
  pt: 'pt',
  eu: 'eu', // euskera
  gl: 'gl', // galego
};

// Delay entre traducciones para evitar rate limiting (Google suele limitar IPs agresivamente)
const TRANSLATE_DELAY = 1200; // ms
const MAX_RETRIES = 4;
const RETRY_DELAY = 4000; // ms

/** Opcional: `pnpm i18n:sync -- --only=eu,gl` o `-- --only eu gl it`. */
function parseOnlyLocalesArg(): Locale[] | undefined {
  const parts: string[] = [];
  const eqArg = process.argv.find((a) => a.startsWith('--only='));
  if (eqArg) {
    parts.push(
      ...eqArg
        .slice('--only='.length)
        .split(/[\s,]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    );
  } else {
    const idx = process.argv.indexOf('--only');
    if (idx >= 0) {
      let i = idx + 1;
      while (i < process.argv.length && !process.argv[i].startsWith('-')) {
        parts.push(process.argv[i].toLowerCase());
        i++;
      }
    }
  }
  if (!parts.length) return undefined;
  const bad = parts.filter((p) => !(SUPPORTED_LOCALES as readonly string[]).includes(p));
  if (bad.length) {
    console.error(`Locales no válidos en --only: ${bad.join(', ')}`);
    process.exit(1);
  }
  if (parts.includes(BASE_LOCALE)) {
    console.error('No incluyas el locale base (es) en --only.');
    process.exit(1);
  }
  return parts as Locale[];
}

/**
 * Lee un archivo JSON de traducción
 */
function readTranslationFile(locale: Locale): Record<string, any> {
  const filePath = join(MESSAGES_DIR, `${locale}.json`);
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error leyendo ${filePath}:`, error);
    return {};
  }
}

/**
 * Ordena solo las claves de primer nivel (design: paridad con es.json en anidación; índice A–Z en raíz).
 */
function sortTopLevelKeys(obj: Record<string, any>): Record<string, any> {
  const sorted: Record<string, any> = {};
  for (const key of Object.keys(obj).sort((a, b) => a.localeCompare(b, 'es'))) {
    sorted[key] = obj[key];
  }
  return sorted;
}

/**
 * Escribe un archivo JSON de traducción
 */
function writeTranslationFile(locale: Locale, data: Record<string, any>): void {
  const filePath = join(MESSAGES_DIR, `${locale}.json`);
  const payload = sortTopLevelKeys(data);
  const content = JSON.stringify(payload, null, 2) + '\n';
  writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ Actualizado: ${locale}.json`);
}

/**
 * Traduce un texto usando Google Translate con reintentos
 */
async function translateText(text: string, targetLocale: Locale, retries: number = MAX_RETRIES): Promise<string> {
  if (targetLocale === BASE_LOCALE) return text;

  /** Sin llamadas externas: rellena huecos con el texto base (castellano) para paridad estructural rápida. */
  if (process.env.I18N_SYNC_SKIP_TRANSLATE === '1') {
    return text;
  }

  try {
    const targetLang = LOCALE_MAP[targetLocale];
    const result = await translate(text, { to: targetLang });
    await new Promise(resolve => setTimeout(resolve, TRANSLATE_DELAY));
    return result.text;
  } catch (error: any) {
    // Si es error de rate limiting y quedan reintentos, esperar y reintentar
    if (error?.message?.includes('Too Many Requests') && retries > 0) {
      console.warn(`⚠ Rate limit alcanzado. Esperando ${RETRY_DELAY}ms antes de reintentar... (${retries} intentos restantes)`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return translateText(text, targetLocale, retries - 1);
    }
    
    console.warn(`⚠ Error traduciendo "${text.substring(0, 50)}..." a ${targetLocale}:`, error?.message || error);
    // Si falla la API, conservamos el texto del idioma base (castellano) para no mostrar marcadores en UI
    return text;
  }
}

/**
 * Compara y sincroniza recursivamente dos objetos.
 * Solo se emiten claves presentes en `base`: las que existían solo en destino se omiten (paridad estricta con es.json).
 */
async function syncObject(
  base: Record<string, any>,
  target: Record<string, any>,
  targetLocale: Locale,
  path: string = ''
): Promise<Record<string, any>> {
  const synced: Record<string, any> = {};

  // Iterar sobre todas las claves del objeto base
  for (const key in base) {
    const currentPath = path ? `${path}.${key}` : key;
    const baseValue = base[key];
    const targetValue = target[key];

    if (typeof baseValue === 'string') {
      // Es un valor de traducción
      if (targetValue === undefined || targetValue === null) {
        // Clave nueva: traducir
        console.log(`  Traduciendo: ${currentPath}`);
        synced[key] = await translateText(baseValue, targetLocale);
      } else if (typeof targetValue === 'string') {
        // Clave existe: verificar si necesita re-traducción
        if (/^\[PENDIENTE\]\s*/.test(targetValue)) {
          // Legado: reintentar traducción desde el base
          console.log(`  Re-traduciendo (marcador legado): ${currentPath}`);
          const translated = await translateText(baseValue, targetLocale);
          synced[key] = translated;
        } else if (targetValue === baseValue && targetLocale !== BASE_LOCALE) {
          // Igual al base: puede ser cognado o término internacional ("total", "email"...).
          // En modo solo-estructura NO forzar reemplazo (evita volcar castellano sobre locales válidos).
          if (process.env.I18N_SYNC_SKIP_TRANSLATE === '1') {
            synced[key] = targetValue;
          } else {
            // Si la traducción es igual al texto base, probablemente no está traducida
            console.log(`  Re-traduciendo (igual al base): ${currentPath}`);
            synced[key] = await translateText(baseValue, targetLocale);
          }
        } else {
          // Traducción existente válida: mantener
          synced[key] = targetValue;
        }
      } else {
        // Tipo incorrecto: reemplazar con traducción
        console.log(`  Corrigiendo tipo en: ${currentPath}`);
        synced[key] = await translateText(baseValue, targetLocale);
      }
    } else if (typeof baseValue === 'object' && baseValue !== null && !Array.isArray(baseValue)) {
      // Es un objeto anidado: sincronizar recursivamente
      const targetNested = typeof targetValue === 'object' && targetValue !== null && !Array.isArray(targetValue)
        ? targetValue
        : {};
      synced[key] = await syncObject(baseValue, targetNested, targetLocale, currentPath);
    } else if (Array.isArray(baseValue)) {
      // Es un array: sincronizar cada elemento
      synced[key] = await syncArray(baseValue, Array.isArray(targetValue) ? targetValue : [], targetLocale, currentPath);
    } else {
      // Otros tipos (number, boolean, null): copiar directamente
      synced[key] = baseValue;
    }
  }

  return synced;
}

/**
 * Sincroniza arrays (para casos como legal.content que tiene arrays de objetos)
 */
async function syncArray(
  baseArray: any[],
  targetArray: any[],
  targetLocale: Locale,
  path: string
): Promise<any[]> {
  const synced: any[] = [];

  for (let i = 0; i < baseArray.length; i++) {
    const baseItem = baseArray[i];
    const targetItem = targetArray[i];

    if (typeof baseItem === 'object' && baseItem !== null && !Array.isArray(baseItem)) {
      // Objeto en el array: sincronizar recursivamente
      const targetObj = typeof targetItem === 'object' && targetItem !== null && !Array.isArray(targetItem)
        ? targetItem
        : {};
      synced.push(await syncObject(baseItem, targetObj, targetLocale, `${path}[${i}]`));
    } else if (typeof baseItem === 'string') {
      // String en el array: traducir si es necesario
      if (targetItem === undefined || typeof targetItem !== 'string') {
        console.log(`  Traduciendo: ${path}[${i}]`);
        synced.push(await translateText(baseItem, targetLocale));
      } else {
        synced.push(targetItem);
      }
    } else {
      // Otros tipos: copiar directamente
      synced.push(baseItem);
    }
  }

  return synced;
}

/**
 * Función principal de sincronización
 */
async function syncTranslations(): Promise<void> {
  console.log('🔄 Iniciando sincronización de traducciones...\n');

  // Leer archivo base (español)
  const baseTranslations = readTranslationFile(BASE_LOCALE);
  console.log(`📖 Archivo base: ${BASE_LOCALE}.json (${Object.keys(baseTranslations).length} claves de primer nivel)\n`);

  const only = parseOnlyLocalesArg();
  if (only?.length) {
    console.log(`📌 Modo --only: ${only.join(', ')}\n`);
  }

  // Idiomas a sincronizar (todos excepto el base, o subconjunto con --only=)
  const localesToSync = SUPPORTED_LOCALES.filter((locale) => locale !== BASE_LOCALE).filter(
    (locale) => !only || only.includes(locale)
  );

  // Sincronizar cada idioma
  for (const locale of localesToSync) {
    console.log(`\n🌍 Sincronizando: ${locale}.json`);
    console.log('─'.repeat(50));

    // Leer traducciones actuales
    const currentTranslations = readTranslationFile(locale);

    // Sincronizar con el archivo base
    const syncedTranslations = await syncObject(
      baseTranslations,
      currentTranslations,
      locale
    );

    // Escribir archivo actualizado
    writeTranslationFile(locale, syncedTranslations);
  }

  console.log('\n✅ Sincronización completada!');
  console.log('\n📝 Nota: Si la API falló en parte, algunos textos pueden seguir en castellano hasta el próximo sync.');
}

// Ejecutar siempre cuando se llama el script
syncTranslations().catch(error => {
  console.error('❌ Error durante la sincronización:', error);
  process.exit(1);
});

export { syncTranslations };
