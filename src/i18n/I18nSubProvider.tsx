'use client';

import { useMemo, type ReactNode } from 'react';
import { I18N_DEFAULTS } from '@/config/constants';
import { makeT } from './dictionary';
import { I18nContext, useI18n } from './I18nProvider';

type Messages = Record<string, unknown>;

/**
 * Fusiona mensajes lazy (p. ej. `legal`) servidos por un layout de ruta en el SSR,
 * sin incluir esos bloques en el núcleo del bundle inicial.
 */
export function I18nSubProvider({ merge, children }: { merge: Messages; children: ReactNode }) {
  const parent = useI18n();
  const messages = useMemo(
    () => ({ ...parent.messages, ...merge }),
    [parent.messages, merge]
  );

  const t = useMemo(() => {
    const base = makeT(messages);
    const fallback = makeT(parent.messages);
    return (key: string, vars?: Record<string, unknown>) => {
      const opts = { ...I18N_DEFAULTS, ...vars };
      return base(key, opts) ?? fallback(key, opts) ?? parent.t(key, vars);
    };
  }, [messages, parent.messages, parent.t]);

  const value = useMemo(
    () => ({
      ...parent,
      messages,
      t,
    }),
    [parent, messages, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
