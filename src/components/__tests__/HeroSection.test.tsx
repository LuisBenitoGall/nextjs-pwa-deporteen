// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import HeroSection from '../HeroSection';
import { I18nProvider } from '@/i18n/I18nProvider';
import { SPORTS } from '@/lib/sports';
import esMessages from '@/i18n/messages/es.json';

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

const FEATURE_IDS = ['feature1', 'feature2', 'feature3', 'feature4', 'feature5', 'feature6'] as const;
const messages = esMessages as unknown as Record<string, string>;

function renderHome() {
  return render(
    <I18nProvider>
      <HeroSection />
    </I18nProvider>
  );
}

/** Un icono por deporte: una tarjeta fantasma dejaría un segundo `img` con el mismo `src`. */
function sportIconCounts(container: HTMLElement) {
  return SPORTS.map(sport => container.querySelectorAll(`img[src="${sport.icon}"]`).length);
}

describe('HeroSection', () => {
  beforeEach(() => {
    localStorage.setItem('locale', 'es');
  });

  it('renderiza cada deporte del catálogo una sola vez', async () => {
    const { container } = renderHome();
    await waitFor(() => expect(screen.getByText(messages.baloncesto)).toBeInTheDocument());

    expect(sportIconCounts(container)).toEqual(SPORTS.map(() => 1));
    for (const sport of SPORTS) {
      expect(screen.getAllByText(messages[sport.i18nKey])).toHaveLength(1);
    }
  });

  it('nunca deja una tarjeta de deporte sin nombre visible', async () => {
    const { container } = renderHome();
    await waitFor(() => expect(screen.getByText(messages.baloncesto)).toBeInTheDocument());

    const labels = [...container.querySelectorAll('[aria-label]')].map(el => el.getAttribute('aria-label'));
    expect(labels).toHaveLength(SPORTS.length);
    expect(labels.every(label => !!label?.trim())).toBe(true);
  });

  it('renderiza las seis características con título y descripción', async () => {
    renderHome();
    await waitFor(() => expect(screen.getByText(messages.baloncesto)).toBeInTheDocument());

    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings).toHaveLength(FEATURE_IDS.length);
    expect(headings.every(h => !!h.textContent?.trim())).toBe(true);

    for (const id of FEATURE_IDS) {
      expect(screen.getAllByText(messages[`home_${id}_title`])).toHaveLength(1);
      expect(screen.getAllByText(messages[`home_${id}_text`])).toHaveLength(1);
    }
  });

  it('no duplica tarjetas cuando el diccionario cambia de idioma', async () => {
    localStorage.setItem('locale', 'en');
    const { container } = renderHome();

    // El diccionario inglés llega tras el primer render: es el momento en que una
    // clave derivada del texto traducido dejaba nodos huérfanos en el DOM.
    await waitFor(() => expect(screen.getByText('Basketball')).toBeInTheDocument());

    expect(sportIconCounts(container)).toEqual(SPORTS.map(() => 1));
    expect(screen.queryByText(messages.baloncesto)).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(FEATURE_IDS.length);
  });
});
