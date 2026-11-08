import { describe, expect, it } from 'vitest';
import { resolveSportStatFieldLabel } from '../statFieldLabel';

describe('resolveSportStatFieldLabel', () => {
  const dict: Record<string, string> = {
    goles: 'Goals',
    asistencias: 'Assists',
    stat_yellow_cards: 'Yellow cards',
  };

  const t = (key: string) => dict[key] ?? '';

  it('traduce por clave de campo conocida', () => {
    expect(resolveSportStatFieldLabel('goals', 'Goles', t)).toBe('Goals');
    expect(resolveSportStatFieldLabel('yellow_cards', 'Tarjetas amarillas', t)).toBe('Yellow cards');
  });

  it('usa etiqueta de BD si no hay traducción', () => {
    expect(resolveSportStatFieldLabel('custom_metric', 'Métrica custom', t)).toBe('Métrica custom');
  });

  it('usa la clave como último recurso', () => {
    expect(resolveSportStatFieldLabel('custom_metric', '', t)).toBe('custom_metric');
  });
});
