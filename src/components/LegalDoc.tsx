'use client';

import { useMemo } from 'react';
import { useI18n, useT } from '@/i18n/I18nProvider';
import { LEGAL_CONSTANTS } from '@/config/constants';
import { sanitizeLegalHtml } from '@/lib/sanitize-legal-html';

type DocId =
  | 'legal_notice'
  | 'privacy'
  | 'cookies'
  | 'terms'
  | 'subscription'
  | 'content_policy';

type Section = { title?: string; html: string };

type Primitive = string | number | boolean | null | undefined;
type PlaceholderValue = Primitive | { [k: string]: PlaceholderValue } | PlaceholderValue[];
type PlaceholderMap = { [k: string]: PlaceholderValue };

/** Sustituye placeholders tipo {{a.b.c}} por valores del mapa (permite objetos y arrays). */
function applyPlaceholders(text: string, vars: PlaceholderMap) {
  return text.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_: string, key: string) => {
    const value = key
      .split('.')
      .reduce<any>((acc, part) => (acc != null ? (acc as any)[part] : undefined), vars as any);
    return value == null ? '' : String(value);
  });
}

/** Limpia HTML de textos legales (SSR-safe, sin jsdom). */
function sanitize(html: string) {
  return sanitizeLegalHtml(html);
}

/** Detecta si t(key) ha fallado (muchas libs devuelven la propia key cuando falta). */
function isMissing(key: string, value: unknown) {
  if (value == null) return true;
  if (typeof value !== 'string') return false;
  return value === key || value.trim().length === 0;
}

export default function LegalDoc({ doc }: { doc: DocId }) {
  const t = useT();
  const { messages } = useI18n();
  const vars: PlaceholderMap = LEGAL_CONSTANTS as PlaceholderMap;

  // Construcción estable de secciones
  const sections = useMemo<Section[]>(() => {
    const fromDict = (messages as { legal?: Record<string, { sections?: Section[] }> })?.legal?.[doc]
      ?.sections;
    if (Array.isArray(fromDict) && fromDict.length) {
      return fromDict.filter((s) => typeof s?.html === 'string' && s.html.length > 0);
    }

    // Plan B: claves indexadas (cuando aún no hay dict en memoria)
    const collected: Section[] = [];
    for (let i = 0; i < 200; i++) {
      const titleKey = `legal.${doc}.sections.${i}.title`;
      const htmlKey = `legal.${doc}.sections.${i}.html`;
      const title = t(titleKey) as unknown as string;
      const html = t(htmlKey) as unknown as string;

      if (isMissing(htmlKey, html)) break;
      collected.push({
        title: isMissing(titleKey, title) ? undefined : title,
        html,
      });
    }

    if (!collected.length) {
      console.warn(
        `[LegalDoc] No hay secciones para 'legal.${doc}.sections'. ` +
          `Comprueba i18n (array o sections.N.*) y que no devuelva la key literal.`
      );
    }

    return collected;
  }, [t, doc, messages]);

  // Render HTML final (memoizado)
  const content = useMemo(() => {
    if (!sections.length) return '<div></div>';

    const html = sections
      .map((s: Section) => {
        const titleHtml = s.title
          ? `<h2 class="text-xl font-semibold mb-2">${applyPlaceholders(s.title, vars)}</h2>`
          : '';
        const bodyHtml = `<div class="prose max-w-none">${applyPlaceholders(s.html, vars)}</div>`;
        return `<section class="mb-6">${titleHtml}${bodyHtml}</section>`;
      })
      .join('');

    return sanitize(html);
  }, [sections, vars]);

  return (
    <div className="mx-auto max-w-3xl p-4 leading-relaxed">
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}
