/**
 * Shared helpers for building Tabulator formatter DOM elements.
 * Class names are written as string literals so Tailwind v4 scanner picks them up.
 */

const SVG_EDIT =
  `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" ` +
  `stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">` +
  `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>` +
  `<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>` +
  `</svg>`;

const SVG_DELETE =
  `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" ` +
  `stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">` +
  `<polyline points="3 6 5 6 21 6"/>` +
  `<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>` +
  `</svg>`;

const SVG_TOGGLE =
  `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" ` +
  `stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">` +
  `<rect x="1" y="5" width="22" height="14" rx="7" ry="7"/>` +
  `<circle cx="8" cy="12" r="3"/>` +
  `</svg>`;

/** Edit button: outline style */
export function makeEditBtn(label = 'Editar'): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className =
    'inline-flex items-center gap-1 h-7 px-2 rounded text-xs border border-slate-600 bg-transparent text-slate-300 hover:text-white hover:border-slate-400 transition-colors';
  btn.innerHTML = `${SVG_EDIT}<span>${label}</span>`;
  return btn;
}

/** Delete button: destructive red style */
export function makeDeleteBtn(label = 'Eliminar'): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className =
    'inline-flex items-center gap-1 h-7 px-2 rounded text-xs border border-red-700/50 bg-red-950/30 text-red-400 hover:text-red-300 hover:bg-red-900/40 transition-colors';
  btn.innerHTML = `${SVG_DELETE}<span>${label}</span>`;
  return btn;
}

/** Toggle button: ghost style */
export function makeToggleBtn(label: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className =
    'inline-flex items-center gap-1 h-7 px-2 rounded text-xs border border-slate-700 bg-transparent text-slate-400 hover:text-slate-100 hover:border-slate-500 transition-colors';
  btn.innerHTML = `${SVG_TOGGLE}<span>${label}</span>`;
  return btn;
}

/**
 * Dispatch a 'tabulator-action' custom event that bubbles up to the parent
 * wrapper div where React listens and updates state.
 */
export function dispatchAction(element: HTMLElement, action: string, row: unknown): void {
  element.dispatchEvent(
    new CustomEvent('tabulator-action', { bubbles: true, detail: { action, row } })
  );
}

/** Wraps buttons in a right-aligned flex container */
export function makeActionsContainer(...buttons: HTMLButtonElement[]): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'flex items-center gap-1.5 justify-end';
  buttons.forEach((btn) => container.appendChild(btn));
  return container;
}
