import Link from 'next/link';
import { tServer } from '@/i18n/server';

export default function PlayerNotFound() {
    const t = typeof tServer === 'function' ? tServer : (tServer as any)?.t;

    return (
        <div>
            <h1 className="text-xl font-semibold mb-2">{t('deportista_no_encontrado')}</h1>
            <p className="text-gray-600">{t('deportista_no_encontrado_mensaje')}</p>
            <div className="mt-4">
                <Link href="/dashboard" className="text-green-700 underline">
                {t('mi_panel_volver')}
                </Link>
            </div>
        </div>
    );
}
