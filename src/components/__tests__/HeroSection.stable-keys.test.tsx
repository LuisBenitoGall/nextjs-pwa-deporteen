// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import HeroSection from '../HeroSection';
import { SPORTS } from '@/lib/sports';
import esMessages from '@/i18n/messages/es.json';

const messages = esMessages as unknown as Record<string, string>;

// El diccionario arranca vacío y se rellena entre renders: reproduce el primer
// render del cliente antes de que resuelva el import del locale.
let dictLoaded = false;

vi.mock('@/i18n/I18nProvider', () => ({
  useT: () => (key: string) => (dictLoaded ? (messages[key] ?? '') : ''),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

describe('HeroSection con claves estables', () => {
  it('no deja tarjetas huérfanas cuando el diccionario llega después del primer render', async () => {
    dictLoaded = false;
    let view!: ReturnType<typeof render>;
    await act(async () => {
      view = render(<HeroSection />);
    });
    const { container } = view;

    dictLoaded = true;
    await act(async () => {
      view.rerender(<HeroSection />);
    });

    // Con `key` derivada del texto traducido, React no borraba los nodos del primer
    // render (claves duplicadas) y quedaban 8 deportes y 5 características fantasma.
    for (const sport of SPORTS) {
      expect(container.querySelectorAll(`img[src="${sport.icon}"]`)).toHaveLength(1);
    }
    expect(container.querySelectorAll('h3')).toHaveLength(6);
    expect([...container.querySelectorAll('h3')].every(h => !!h.textContent?.trim())).toBe(true);
  });
});
