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

// Mapeo de códigos de idioma para Google Translate
const LOCALE_MAP: Record<Locale, string> = {
  es: 'es',
  en: 'en',
  ca: 'ca',
  it: 'it',
};

// Delay entre traducciones para evitar rate limiting
const TRANSLATE_DELAY = 500; // ms (aumentado para evitar rate limiting)
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // ms

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
 * Escribe un archivo JSON de traducción
 */
function writeTranslationFile(locale: Locale, data: Record<string, any>): void {
  const filePath = join(MESSAGES_DIR, `${locale}.json`);
  const content = JSON.stringify(data, null, 2) + '\n';
  writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ Actualizado: ${locale}.json`);
}

/**
 * Traduce un texto usando Google Translate con reintentos
 */
async function translateText(text: string, targetLocale: Locale, retries: number = MAX_RETRIES): Promise<string> {
  if (targetLocale === BASE_LOCALE) return text;
  
  // Si el texto ya está marcado como pendiente, no traducir
  if (text.startsWith('[PENDIENTE]')) return text;
  
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
    // Si falla la traducción, devolvemos el texto original marcado
    return `[PENDIENTE] ${text}`;
  }
}

/**
 * Compara y sincroniza recursivamente dos objetos
 * Retorna el objeto sincronizado con traducciones actualizadas
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
        if (targetValue.startsWith('[PENDIENTE]')) {
          // Traducción pendiente: intentar traducir de nuevo
          console.log(`  Re-traduciendo (pendiente): ${currentPath}`);
          const translated = await translateText(baseValue, targetLocale);
          synced[key] = translated;
        } else if (targetValue === baseValue && targetLocale !== BASE_LOCALE) {
          // Si la traducción es igual al texto base, probablemente no está traducida
          console.log(`  Re-traduciendo (igual al base): ${currentPath}`);
          synced[key] = await translateText(baseValue, targetLocale);
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

  // Obtener idiomas a sincronizar (todos excepto el base)
  const localesToSync = SUPPORTED_LOCALES.filter(locale => locale !== BASE_LOCALE);

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
  console.log('\n📝 Nota: Revisa las traducciones marcadas con [PENDIENTE] y tradúcelas manualmente si es necesario.');
}

// Ejecutar siempre cuando se llama el script
syncTranslations().catch(error => {
  console.error('❌ Error durante la sincronización:', error);
  process.exit(1);
});

export { syncTranslations };
