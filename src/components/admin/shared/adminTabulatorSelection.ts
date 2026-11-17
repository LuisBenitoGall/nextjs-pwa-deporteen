/** Estado visual del checkbox de cabecera según las filas activas. */
export function activeHeaderCheckboxState(selectedCount: number, activeCount: number) {
  if (selectedCount === 0) {
    return { checked: false, indeterminate: false };
  }

  if (selectedCount === activeCount) {
    return { checked: true, indeterminate: false };
  }

  return { checked: false, indeterminate: true };
}

/** Índices seleccionados que un filtro de cabecera ya no muestra. */
export function indexesOutsideActive(
  selectedIndexes: readonly unknown[],
  activeIndexes: readonly unknown[],
) {
  const active = new Set(activeIndexes);
  return selectedIndexes.filter((index) => !active.has(index));
}
