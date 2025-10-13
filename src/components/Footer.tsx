import Link from 'next/link';
import { APP, ROUTES } from '@/config/constants';
import { tServer } from '@/i18n/server';
import FooterPreferencesLink from './FooterPreferencesLink'; // client child

export default async function Footer() {
    const year = new Date().getFullYear();
    const tApi = await tServer();
    const t = typeof tApi === 'function' ? tApi : (tApi as any)?.t;

    return (
        <footer className="mt-16 border-t border-green-100 bg-green-50 text-sm text-gray-700">
            <div className="mx-auto max-w-5xl px-6 py-10">
                <div className="grid gap-8 sm:grid-cols-3">
                    {/* Menú común */}
                    <div>
                        <h3 className="mb-2 font-semibold text-gray-900">{t('menu')}</h3>
                        <ul className="space-y-1">
                            <li><Link className="hover:underline" href={ROUTES.HOME}>{t('inicio')}</Link></li>
                            <li><Link className="hover:underline" href={ROUTES.DASHBOARD}>{t('mi_panel')}</Link></li>
                            <li><Link className="hover:underline" href={ROUTES.ACCOUNT}>{t('cuenta_mi')}</Link></li>
                            <li><Link className="hover:underline" href={ROUTES.CONTACT}>{t('contacto')}</Link></li>
                        </ul>
                    </div>

                    {/* Legales */}
                    <div>
                        <h3 className="mb-2 font-semibold text-gray-900">{t('legal_')}</h3>
                        <ul className="space-y-1">
                            <li><Link className="hover:underline" href="/legal/terminos">{t('terminos_condiciones')}</Link></li>
                            <li><Link className="hover:underline" href="/legal/privacidad">{t('politica_privacidad')}</Link></li>
                            <li><Link className="hover:underline" href="/legal/politica-cookies">{t('politica_cookies')}</Link></li>
                            <li><Link className="hover:underline" href="/legal/aviso-legal">{t('aviso_legal')}</Link></li>

                            {/* Enlace permanente para abrir preferencias de cookies */}
                            <li><FooterPreferencesLink /></li>
                        </ul>
                    </div>

                    {/* Marca */}
                    <div>
                        <h3 className="mb-2 font-semibold text-gray-900">{APP.NAME}</h3>
                        <p className="text-gray-600">Powered by {APP.DEVELOPERS}</p>
                        <p className="mt-2 text-gray-600">© {year} {APP.NAME}. {t('derechos_reservados')}</p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
