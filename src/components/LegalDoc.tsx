'use client';

import DOMPurify from 'isomorphic-dompurify';
import { useMemo } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { LEGAL_CONSTANTS } from '@/config/constants';

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

/** Limpia HTML con DOMPurify. */
function sanitize(html: string) {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id'],
  });
}

/** Detecta si t(key) ha fallado (muchas libs devuelven la propia key cuando falta). */
function isMissing(key: string, value: unknown) {
  if (value == null) return true;
  if (typeof value !== 'string') return false;
  return value === key || value.trim().length === 0;
}

export default function LegalDoc({ doc }: { doc: DocId }) {
  const t = useT();
  const vars: PlaceholderMap = LEGAL_CONSTANTS as PlaceholderMap;

  // Construcción estable de secciones
  const sections = useMemo<Section[]>(() => {
    // 1) Intento "ideal": pedir el array entero (si la i18n lo soporta)
    const raw = t(`legal.${doc}.sections`, { returnObjects: true } as any) as unknown;

    let out: Section[] = Array.isArray(raw)
      ? (raw as Section[])
      : Array.isArray((raw as any)?.sections)
      ? ((raw as any).sections as Section[])
      : [];

    // 2) Plan B: leer secciones indexadas legal.X.sections.0.*, 1.*, ... hasta que falte .html
    if (!out.length) {
      const collected: Section[] = [];
      for (let i = 0; i < 200; i++) {
        const titleKey = `legal.${doc}.sections.${i}.title`;
        const htmlKey = `legal.${doc}.sections.${i}.html`;
        const title = t(titleKey) as unknown as string;
        const html = t(htmlKey) as unknown as string;

        if (isMissing(htmlKey, html)) break; // sin html, fin de lista
        collected.push({
          title: isMissing(titleKey, title) ? undefined : title,
          html,
        });
      }
      out = collected;
    }

    if (!out.length) {
      // Aviso para depurar sin romper render
      console.warn(
        `[LegalDoc] No hay secciones para 'legal.${doc}.sections'. ` +
          `Comprueba i18n (array o sections.N.*) y que no devuelva la key literal.`
      );
    }

    return out;
  }, [t, doc]);

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
