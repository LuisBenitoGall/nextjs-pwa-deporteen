import { describe, expect, it } from 'vitest';
import { activeHeaderCheckboxState, indexesOutsideActive } from './adminTabulatorSelection';

describe('activeHeaderCheckboxState', () => {
  it('deja la cabecera vacía cuando no hay filas activas marcadas', () => {
    expect(activeHeaderCheckboxState(0, 4)).toEqual({ checked: false, indeterminate: false });
    expect(activeHeaderCheckboxState(0, 0)).toEqual({ checked: false, indeterminate: false });
  });

  it('marca checked cuando todas las activas están seleccionadas', () => {
    expect(activeHeaderCheckboxState(3, 3)).toEqual({ checked: true, indeterminate: false });
  });

  it('queda indeterminada cuando la selección es parcial', () => {
    expect(activeHeaderCheckboxState(1, 3)).toEqual({ checked: false, indeterminate: true });
  });
});

describe('indexesOutsideActive', () => {
  it('devuelve solo las filas marcadas que el filtro oculta', () => {
    expect(indexesOutsideActive(['a', 'b', 'c'], ['b'])).toEqual(['a', 'c']);
  });

  it('no quita filas que siguen activas, aunque estén en otra página', () => {
    expect(indexesOutsideActive(['a', 'b'], ['a', 'b', 'c'])).toEqual([]);
  });
});
