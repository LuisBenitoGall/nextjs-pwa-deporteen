'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useLocale, useT } from '@/i18n/I18nProvider';

// Components
import Select from '@/components/Select';

type UserLike = {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, any>;
} | null;

export default function Navbar({ serverUserId }: { serverUserId?: string | null }) {
    const t = useT();
    const { locale, setLocale, locales } = useLocale();
    const BRAND = process.env.NEXT_PUBLIC_PROJECT || 'DeporTeen';

    const [user, setUser] = useState<UserLike>(serverUserId ? ({ id: serverUserId } as any) : null);
    const [langOpen, setLangOpen] = useState(false);
    const [userOpen, setUserOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    // Marca que ya verificamos el estado de auth en el cliente
    const [authChecked, setAuthChecked] = useState(false);

    const langRef = useRef<HTMLDivElement>(null);
    const userRef = useRef<HTMLDivElement>(null);
    const loggingOutRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  // Detecta si la ruta es protegida (dashboard, account, players, settings), con o sin prefijo de idioma
  const pathParts = (pathname || '/').split('?')[0].split('/').filter(Boolean);
  const maybeLocale = pathParts[0];
  const hasLocalePrefix = locales?.some?.(l => l.code === maybeLocale) ?? false;
  const firstSeg = hasLocalePrefix ? (pathParts[1] || '') : (pathParts[0] || '');
  const isProtectedPath = ['dashboard', 'account', 'players', 'settings'].includes(firstSeg);
    const hideAuthUI = pathname === '/logout';

    // Cierra menús al cambiar de ruta
    useEffect(() => {
        setMobileOpen(false);
        setLangOpen(false);
        setUserOpen(false);
    }, [pathname]);

  // Detecta sesión y suscribe a cambios
    useEffect(() => {
        let mounted = true;

        // Si llegamos con ?logout=1, no intentes hidratar una sesión inicial
        try {
            const url = new URL(window.location.href);
            if (url.searchParams.get('logout') === '1' || url.pathname === '/logout') {
                return;
            }
        } catch {}

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return;
            if (loggingOutRef.current) return;
          // Actualiza sólo si hay usuario; no machacar con null estados recientes de login
          if (session?.user) setUser(session.user as any);
          setAuthChecked(true);
        });

    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      if (loggingOutRef.current) return;
      if (session?.user) {
        setUser(session.user as any);
      } else if (evt === 'SIGNED_OUT' || evt === 'USER_DELETED') {
        setUser(null);
      } // Ignora INITIAL_SESSION vacío para no machacar SSR
      setAuthChecked(true);
    });

        return () => {
            mounted = false;
            sub?.subscription?.unsubscribe?.();
        };
    }, []);

  // Escucha señales de auth (postMessage) para hidratar inmediatamente tras login por password
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel('auth');
    const onMsg = (ev: MessageEvent) => {
      const msg = ev.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'SIGNED_IN' && msg.user) {
        loggingOutRef.current = false;
        setUser(msg.user as any);
        setAuthChecked(true);
      }
    };
    bc.addEventListener('message', onMsg);
    return () => {
      try { bc.removeEventListener('message', onMsg); bc.close(); } catch {}
    };
  }, []);

  // Re-sincroniza el usuario al cambiar de ruta (evita quedarse con CTAs tras login si el layout no se re-renderiza)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.pathname === '/logout') return;
    let cancelled = false;
    const recheck = async (attempt = 0) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (loggingOutRef.current) return;
      if (session?.user) {
        setUser(session.user as any);
        setAuthChecked(true);
        return;
      }
      // Si aún no hay sesión, marca authChecked pero sigue intentando unas veces
      setAuthChecked(true);
      // Refuerzo: si estamos en ruta protegida, pregunta al servidor (cookies SSR) quién es el usuario
      try {
        if (isProtectedPath && attempt === 0) {
          const r = await fetch('/api/auth/me', { cache: 'no-store' });
          if (!cancelled && r.ok) {
            const j = await r.json();
            if (j?.user) {
              setUser(j.user as any);
              return;
            }
          }
        }
      } catch {}
      if (attempt < 5) {
        const delay = Math.min(1600, 100 * Math.pow(2, attempt)); // 100,200,400,800,1600
        setTimeout(() => { recheck(attempt + 1); }, delay);
      }
    };
    recheck(0);
    return () => { cancelled = true; };
  }, [pathname]);

    // Marca el componente como montado para evitar desajustes de hidratación con UI dependiente de auth
    useEffect(() => {
        setMounted(true);
    }, []);

  // Si el servidor ya indicó un usuario, permite mostrar el menú inmediatamente
  useEffect(() => {
    if (serverUserId && !authChecked) {
      setAuthChecked(true);
    }
    // sólo interesa en el primer montaje
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si venimos de un redirect con ?logout=1 o estamos en /logout, asegura el signOut del cliente y pide al servidor borrar cookies, luego vuelve a inicio
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const url = new URL(window.location.href);
    if (url.searchParams.get('logout') === '1' || url.pathname === '/logout') {
            (async () => {
                loggingOutRef.current = true;
                try {
                    await supabase.auth.signOut();
                } catch {}
                // Limpia cualquier vestigio en localStorage de Supabase (sb-*) y estado local
                try {
                    for (let i = localStorage.length - 1; i >= 0; i--) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith('sb-')) localStorage.removeItem(key);
                    }
                } catch {}
                setUser(null);
                setAuthChecked(true);
        // Enviar al servidor la orden de borrar cookies, sin esperar respuesta, y navegar inmediatamente a inicio
        try {
          fetch('/logout', { method: 'POST', cache: 'no-store', keepalive: true }).catch(() => {});
        } catch {}
        window.location.replace('/');
            })();
        }
    }, []);

  // Si el servidor dejó la cookie 'client-logout', limpia estado cliente igualmente (por si llegamos a '/' sin query)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    try {
      const cookieStr = document.cookie || '';
      if (cookieStr.includes('client-logout=1')) {
        (async () => {
          loggingOutRef.current = true;
          try { await supabase.auth.signOut(); } catch {}
          try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const key = localStorage.key(i);
              if (key && key.startsWith('sb-')) localStorage.removeItem(key);
            }
          } catch {}
          setUser(null);
          setAuthChecked(true);
          // Borra la cookie en cliente
          try { document.cookie = 'client-logout=; Max-Age=0; path=/'; } catch {}
          // Vuelve a permitir eventos de auth
          loggingOutRef.current = false;
        })();
      }
    } catch {}
  }, []);

  // Al navegar fuera de /logout y sin cookie de cierre, reactivamos los eventos de auth
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const hasClientLogout = (typeof document !== 'undefined') && (document.cookie || '').includes('client-logout=1');
    if (url.pathname !== '/logout' && !hasClientLogout) {
      loggingOutRef.current = false;
    }
  }, [pathname]);

    // Click fuera: cerrar dropdowns
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
          const target = e.target as Node;
          if (langRef.current && !langRef.current.contains(target)) setLangOpen(false);
          if (userRef.current && !userRef.current.contains(target)) setUserOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

  async function handleLogout() {
    loggingOutRef.current = true;
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-')) localStorage.removeItem(key);
      }
    } catch {}
    setUser(null);
    setAuthChecked(true);
    try {
      fetch('/logout', { method: 'POST', cache: 'no-store', keepalive: true }).catch(() => {});
    } catch {}
    router.replace('/');
    router.refresh();
  }

    const displayName =
        (user as any)?.user_metadata?.name ||
        (user as any)?.user_metadata?.full_name ||
        (user as any)?.user_metadata?.given_name ||
        (user?.email ? user.email.split('@')[0] : '') ||
        t('usuario') ||
        'usuario';

    // Selector de idioma (desktop)
    const LangSelectorDesktop = (
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setLangOpen(o => !o)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm hover:text-green-600"
            aria-haspopup="listbox"
            aria-expanded={langOpen}
          >
            {locales.find(l => l.code === locale)?.label ?? t('idioma') ?? 'Idioma'}
            <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 7l5 6 5-6H5z" fill="currentColor" />
            </svg>
          </button>

          {langOpen && (
            <div className="absolute right-0 z-50 mt-2 w-44 rounded-md border border-gray-200 bg-white shadow-md">
              {locales.map(({ code, label, disabled }) => (
                <button
                  key={code}
                  onClick={() => {
                    if (!disabled) {
                      setLocale(code as any);
                      setLangOpen(false);
                    }
                  }}
                  disabled={disabled}
                  className={[
                    'block w-full px-3 py-2 text-left text-sm',
                    disabled ? 'cursor-not-allowed text-gray-400' : 'hover:bg-green-50 text-gray-700',
                    locale === code ? 'bg-green-100 font-semibold' : '',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
    );

    // Menú de usuario (desktop): Hola, [nombre] -> dropdown
    const UserMenuDesktop = user && (
        <div className="relative" ref={userRef}>
            <button
                onClick={() => setUserOpen(o => !o)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-gray-700 hover:text-green-600"
                aria-haspopup="menu"
                aria-expanded={userOpen}
            >
                {t('hola') || 'Hola'}, {displayName}
                <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M5 7l5 6 5-6H5z" fill="currentColor" />
                </svg>
            </button>

            {userOpen && (
                <div className="absolute right-0 z-50 mt-2 w-48 rounded-md border border-gray-200 bg-white shadow-md">
                    <Link
                    href="/dashboard"
                    onClick={() => setUserOpen(false)}
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-green-50"
                    >
                        {t('mi_panel') || 'Mi Panel'}
                    </Link>
                  
                    <Link
                        href="/account"
                        onClick={() => setUserOpen(false)}
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-green-50"
                    >
                        {t('cuenta_mi') || 'Mi Cuenta'}
                    </Link>
                  
                    <button
                        onClick={async () => {
                          await handleLogout();
                          setUserOpen(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-green-50"
                    >
                        {t('logout') || 'Salir'}
                    </button>
                </div>
            )}
        </div>
    );

  // Placeholder de menú de usuario (desktop) mientras resolvemos auth en rutas protegidas
  const UserMenuPlaceholder = (
    <div className="h-8 w-36 rounded-md bg-gray-200 animate-pulse" aria-hidden="true" />
  );

  // Mostrar CTAs: en rutas protegidas no mostramos CTAs aunque aún no se haya resuelto user
  const showCTAs = mounted && !isProtectedPath && ((hideAuthUI) ? true : (authChecked && !user));

  return (
        <nav className="fixed left-0 right-0 top-0 z-50 border-b border-gray-200 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
                {/* Brand */}
                <div className="text-lg font-semibold text-green-700">
                    <Link href="/">{BRAND}</Link>
                </div>

                {/* Desktop nav */}
                <div className="hidden items-center gap-6 md:flex">
                    <Link href="/" className="text-sm font-medium text-gray-700 hover:text-green-600">
                        {t('inicio') || 'Inicio'}
                    </Link>

                    <Link href="/contacto" className="text-sm font-medium text-gray-700 hover:text-green-600">
                        {t('contacto') || 'Contacto'}
                    </Link>

          {LangSelectorDesktop}

          {/* Menú de usuario: en rutas protegidas, muestra placeholder mientras no haya user; si hay user, muestra el menú real */}
          {mounted && !hideAuthUI && (
            user ? UserMenuDesktop : (isProtectedPath ? UserMenuPlaceholder : null)
          )}

          {/* CTA login/registro solo tras mount y authChecked */}
      {showCTAs && (
                        <div className="flex items-center gap-3">
                            <Link
                                href="/login"
                                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-green-600"
                            >
                                {t('login') || 'Entrar'}
                            </Link>
                            <Link
                                href="/registro"
                                className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
                            >
                                {t('registrate') || 'Registrarse'}
                            </Link>
                        </div>
                    )}
                </div>

                {/* Mobile: hamburger */}
                <button
                  className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 md:hidden"
                  aria-label="Open menu"
                  onClick={() => setMobileOpen(true)}
                >
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M3 12h18M3 18h18" />
                    </svg>
                </button>
            </div>

            {/* Mobile overlay */}
            {mobileOpen && (
                <>
                    <div
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]"
                        onClick={() => setMobileOpen(false)}
                    />

                    <div
                        className={[
                          'fixed right-0 top-0 z-[70] h-full w-80 translate-x-0 transform bg-white',
                          'shadow-2xl drop-shadow-2xl ring-1 ring-black/10 transition-transform md:hidden',
                          'shadow-[-10px_0_30px_rgba(0,0,0,0.25)]',
                        ].join(' ')}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="flex bg-white items-center justify-between px-4 py-3">
                            <span className="text-base font-semibold text-green-700">{BRAND}</span>
                            <button
                                className="rounded-md p-2 text-gray-700 hover:bg-gray-100"
                                aria-label="Close menu"
                                onClick={() => setMobileOpen(false)}
                            >
                                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 6l12 12M18 6l-12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex h-[calc(100%-3.25rem)] flex-col justify-between">
                            <ul className="bg-white space-y-0 px-2 py-3">
                                {/* Saludo */}
                {mounted && !hideAuthUI && authChecked && user && (
                                    <>
                                        <li className="pt-2">
                                            <span className="block select-none px-3 py-2 text-sm font-semibold text-gray-900">
                                                {(t('hola') || 'Hola') + ', ' + displayName}
                                            </span>
                                        </li>
                                    </>
                                )}

                                {/* Inicio */}
                                <li>
                                    <Link
                                    href="/"
                                    className="block rounded-md px-3 py-2 text-sm font-medium text-gray-800 hover:bg-green-50"
                                    onClick={() => setMobileOpen(false)}
                                    >
                                        {t('inicio') || 'Inicio'}
                                    </Link>
                                </li>

                                {/* Contacto */}
                                <li>
                                    <Link
                                        href="/contacto"
                                        className="block rounded-md px-3 py-2 text-sm font-medium text-gray-800 hover:bg-green-50"
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        {t('contacto') || 'Contacto'}
                                    </Link>
                                </li>

                                {/* Saludo y opciones personales (enlazadas como <li> individuales).
                                Solo si hay usuario, y el saludo va el primero de todos. */}
                                {mounted && !hideAuthUI && authChecked && user && (
                                    <>
                                        <li>
                                          <Link
                                            href="/dashboard"
                                            onClick={() => setMobileOpen(false)}
                                            className="block rounded-md px-3 py-2 text-sm font-medium text-gray-800 hover:bg-green-50"
                                          >
                                            {t('mi_panel') || 'Mi Panel'}
                                          </Link>
                                        </li>

                                        <li>
                                          <Link
                                            href="/account"
                                            onClick={() => setMobileOpen(false)}
                                            className="block rounded-md px-3 py-2 text-sm font-medium text-gray-800 hover:bg-green-50"
                                          >
                                            {t('cuenta_mi') || 'Mi Cuenta'}
                                          </Link>
                                        </li>

                                        <li>
                                          <button
                                            onClick={async () => {
                                              await handleLogout();
                                              setMobileOpen(false);
                                            }}
                                            className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-800 hover:bg-green-50"
                                          >
                                            {t('logout') || 'Salir'}
                                          </button>
                                        </li>
                                    </>
                                )}

                                {/* Si no hay sesión, CTA como siempre */}
                                {showCTAs && (
                                    <>
                                        <li className="pt-2">
                                          <Link
                                            href="/login"
                                            onClick={() => setMobileOpen(false)}
                                            className="block rounded-md px-3 py-2 text-sm font-medium text-gray-800 hover:bg-green-50"
                                          >
                                            {t('login') || 'Entrar'}
                                          </Link>
                                        </li>
                                        <li>
                                          <Link
                                            href="/registro"
                                            onClick={() => setMobileOpen(false)}
                                            className="block rounded-md px-3 py-2 text-sm font-medium text-gray-800 hover:bg-green-50"
                                          >
                                            {t('registrate') || 'Registrarse'}
                                          </Link>
                                        </li>
                                    </>
                                )}

                                {/* Idioma: último ítem del menú usando tu <Select /> */}
                                <li className="mt-2 pt-2">
                                    <div className="px-3">
                                        <Select
                                          name="locale"
                                          options={locales.map(l => ({
                                            value: l.code,
                                            label: l.label,
                                            disabled: l.disabled,
                                          }))}
                                          value={locale}
                                          onChange={(e: any) => setLocale((e.target.value as string) as any)}
                                          uiSize="sm"
                                          className="text-sm"
                                          aria-label={t('idioma') ?? 'Idioma'}
                                          required={false}
                                        />
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </>
            )}
        </nav>
    );
}
