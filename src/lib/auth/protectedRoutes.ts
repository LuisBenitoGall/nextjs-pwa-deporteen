/** Rutas que exigen sesión (alineado con middleware). */
export function isProtectedAppPath(pathname: string): boolean {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/players') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/subscription') ||
    pathname.startsWith('/billing') ||
    pathname.startsWith('/matches') ||
    pathname.startsWith('/gallery')
  );
}
