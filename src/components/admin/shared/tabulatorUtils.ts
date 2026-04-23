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

const SVG_EXTERNAL =
  `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" ` +
  `stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">` +
  `<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>` +
  `<polyline points="15 3 21 3 21 9"/>` +
  `<line x1="10" y1="14" x2="21" y2="3"/>` +
  `</svg>`;

function makeIconActionBtn(
  iconSvg: string,
  label: string,
  kind: 'neutral' | 'danger' | 'success' = 'neutral'
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  const palette =
    kind === 'danger'
      ? 'border-red-700/50 bg-red-950/30 text-red-400 hover:text-red-300 hover:bg-red-900/40'
      : kind === 'success'
        ? 'border-emerald-700/50 bg-emerald-950/30 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30'
        : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:text-slate-100 hover:border-slate-500';
  btn.className = `relative inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${palette}`;
  btn.setAttribute('aria-label', label);
  btn.innerHTML = `${iconSvg}<span class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100">${label}</span>`;
  btn.classList.add('group');
  return btn;
}

/** Edit button: icon only + popover tooltip */
export function makeEditBtn(label = 'Editar'): HTMLButtonElement {
  return makeIconActionBtn(SVG_EDIT, label, 'neutral');
}

/** Delete button: icon only + popover tooltip */
export function makeDeleteBtn(label = 'Eliminar'): HTMLButtonElement {
  return makeIconActionBtn(SVG_DELETE, label, 'danger');
}

/** Toggle button: ghost style */
export function makeToggleBtn(label: string): HTMLButtonElement {
  return makeIconActionBtn(SVG_TOGGLE, label, 'neutral');
}

/** External-link action button */
export function makeExternalLinkBtn(url: string, label = 'Ver en Stripe'): HTMLAnchorElement {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noreferrer';
  a.className =
    'group relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-emerald-700/50 bg-emerald-950/30 text-emerald-400 transition-colors hover:border-emerald-600 hover:text-emerald-300 hover:bg-emerald-900/30';
  a.setAttribute('aria-label', label);
  a.innerHTML = `${SVG_EXTERNAL}<span class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100">${label}</span>`;
  return a;
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
export function makeActionsContainer(...buttons: HTMLElement[]): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'flex items-center gap-2 justify-end';
  buttons.forEach((btn) => container.appendChild(btn));
  return container;
}
