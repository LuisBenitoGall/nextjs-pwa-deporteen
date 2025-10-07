'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useT } from '@/i18n/I18nProvider';
import { supabase } from '@/lib/supabase/client';

import type { Session } from '@supabase/supabase-js';

export default function HeroSection() {
    const t = useT();
    const [session, setSession] = useState<Session | null>(null);
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        let mounted = true;

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return;
            setSession(session ?? null);
            setAuthChecked(true);
        });

        const { data: listener } = supabase.auth.onAuthStateChange((_, nextSession) => {
            setSession(nextSession ?? null);
            setAuthChecked(true);
        });

        return () => {
            mounted = false;
            listener.subscription.unsubscribe();
        };
    }, []);

    return (
        <section className="px-0 pb-20 pt-8 home_">
            {/* Bloque principal */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                {/* Texto principal */}
                <div className="text-center md:text-left">
                    <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                        {t('claim')}
                    </span>
                    <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight text-green-700">
                        {t('titulo')}
                    </h1>
                    <p className="mt-6 text-lg text-gray-600">
                        {t('descripcion')}
                    </p>
                    {authChecked && !session && (
                        <div className="mt-8 flex flex-col sm:flex-row justify-center md:justify-start gap-4">
                            <Link href="/registro">
                                <button className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg shadow transition">
                                    {t('registrate')}
                                </button>
                            </Link>

                            <Link href="/login">
                                <button className="border border-green-600 text-green-600 hover:bg-green-50 font-semibold px-6 py-3 rounded-lg transition">
                                    {t('login')}
                                </button>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Imagen ilustrativa */}
                <div className="flex justify-center md:justify-end">
                    <Image
                        src="/img/balls.jpg"
                        alt={t('alt_hero_image') || 'Hero'}
                        width={640}
                        height={480}
                        className="w-full max-w-md rounded-xl shadow-lg h-auto"
                        priority
                    />
                </div>
            </div>

            {/* Bloque deportes */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 items-center rounded-lg bg-green-50 my-16 py-8 px-6">
                <h2 className="text-3xl font-bold text-foreground text-center mb-3 w-full">{ t('deportes') }</h2>
                <p className="text-center m-0 font-bold text-gray-500">Registra el historial deportivo de estos deportes</p>
            </div>

            {/* Bloque características */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start rounded-lg bg-gray-50 my-16 py-8 px-6">
                <div className="flex flex-col items-start p-6 border border-gray-200 rounded-lg shadow bg-white h-40">
                    <div className="flex items-center justify-center w-12 h-12 bg-green-600 rounded-full mb-4">
                        <Image src="/icons/athlete.svg" alt="Athlete Icon" width={24} height={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Gestión de Deportistas</h3>
                    <p className="text-sm text-gray-500 w-full">Registra y organiza a todos tus deportistas favoritos</p>
                </div>
                <div className="flex flex-col items-start p-6 border border-gray-200 rounded-lg shadow bg-white h-40">
                    <div className="flex items-center justify-center w-12 h-12 bg-green-600 rounded-full mb-4">
                        <Image src="/icons/sports.svg" alt="Sports Icon" width={24} height={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Múltiples Deportes</h3>
                    <p className="text-sm text-gray-500 w-full">Fútbol, baloncesto, voleibol y 5 deportes más</p>
                </div>
                <div className="flex flex-col items-start p-6 border border-gray-200 rounded-lg shadow bg-white h-40">
                    <div className="flex items-center justify-center w-12 h-12 bg-green-600 rounded-full mb-4">
                        <Image src="/icons/stats.svg" alt="Stats Icon" width={24} height={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Estadísticas Detalladas</h3>
                    <p className="text-sm text-gray-500 w-full">Analiza el rendimiento de cada partido y temporada</p>
                </div>
                <div className="flex flex-col items-start p-6 border border-gray-200 rounded-lg shadow bg-white h-40">
                    <div className="flex items-center justify-center w-12 h-12 bg-green-600 rounded-full mb-4">
                        <Image src="/icons/media.svg" alt="Media Icon" width={24} height={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Fotos y Videos</h3>
                    <p className="text-sm text-gray-500 w-full">Captura y almacena los mejores momentos</p>
                </div>
                <div className="flex flex-col items-start p-6 border border-gray-200 rounded-lg shadow bg-white h-40">
                    <div className="flex items-center justify-center w-12 h-12 bg-green-600 rounded-full mb-4">
                        <Image src="/icons/offline.svg" alt="Offline Icon" width={24} height={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Funciona Offline</h3>
                    <p className="text-sm text-gray-500 w-full">Registra datos incluso sin conexión a internet</p>
                </div>
                <div className="flex flex-col items-start p-6 border border-gray-200 rounded-lg shadow bg-white h-40">
                    <div className="flex items-center justify-center w-12 h-12 bg-green-600 rounded-full mb-4">
                        <Image src="/icons/mobile.svg" alt="Mobile Icon" width={24} height={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">PWA Móvil</h3>
                    <p className="text-sm text-gray-500 w-full">Optimizada para móviles y tablets</p>
                </div>
            </div>
        </section>
    );
}
