'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useT } from '@/i18n/I18nProvider';
import { supabase } from '@/lib/supabase/client';
import { getSportIconPath } from '@/lib/sports';

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

    // Lista en el orden indicado en tu comentario
    const SPORT_NAMES: readonly { name: string; icon: string }[] = [
        { name: t('baloncesto'), icon: 'baloncesto' },
        { name: t('futbol'), icon: 'futbol' },
        { name: t('futbol_sala'), icon: 'futbol-sala' },
        { name: t('balonmano'), icon: 'balonmano' },
        { name: t('rugby'), icon: 'rugby' },
        { name: t('voleibol'), icon: 'voleibol' },
        { name: t('waterpolo'), icon: 'waterpolo' },
        { name: t('hockey_hierba'), icon: 'hockey-hierba' },
        { name: t('hockey_patines'), icon: 'hockey-patines' }
    ];

    const FEATURES = [
        {   title: t('home_feature1_title'),
            desc: t('home_feature1_text'),
            icon: '/icons/athlete.svg',
        },
        {
            title: t('home_feature2_title'),
            desc: t('home_feature2_text'),
            icon: '/icons/sports.svg',
        },
        {
            title: t('home_feature3_title'),
            desc: t('home_feature3_text'),
            icon: '/icons/stats.svg',
        },
        {
            title: t('home_feature4_title'),
            desc: t('home_feature4_text'),
            icon: '/icons/media.svg',
        },
        {
            title: t('home_feature5_title'),
            desc: t('home_feature5_text'),
            icon: '/icons/offline.svg',
        },
        {
            title: t('home_feature6_title'),
            desc: t('home_feature6_text'),
            icon: '/icons/mobile.svg',
        }
    ];

    function FeatureCard({
        title,
        desc,
        icon, // ruta a svg/png
    }: {
        title: string;
        desc: string;
        icon: string;
    }) {
        return (
            <div className="h-full flex flex-col rounded-xl bg-white p-4 md:p-5 ring-1 ring-gray-200 shadow-sm hover:shadow-md hover:ring-green-200 transition">
                {/* Layout interno estable: header + body */}
                <div className="grid gap-y-1">
                    {/* HEADER: icono + título en una sola fila, siempre alineados */}
                    <div className="col-span-2 flex items-center gap-3 md:gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-green-600">
                        <Image src={icon} alt="" width={20} height={20} className="invert" />
                    </div>
                    <h3 className="m-0 text-[16px] md:text-[17px] font-semibold leading-6 text-gray-900">
                        {title}
                    </h3>
                    </div>

                    {/* BODY: descripción ocupa todo el ancho del card */}
                    <div className="col-span-2">
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                        {desc}
                    </p>
                    </div>
                </div>
            </div>
        );
    }

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
            <div className="max-w-7xl mx-auto grid grid-cols-1 items-center rounded-lg bg-green-50 my-8 py-8 px-6" id="block-sports">
                <h2 className="text-3xl font-bold text-foreground text-center mb-3 w-full">{ t('deportes') }</h2>
                <p className="text-center m-0 font-bold text-gray-500">Registra el historial deportivo de estos deportes</p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-6 mt-8">
                    {SPORT_NAMES.map((sport) => {
                        const icon = getSportIconPath(sport.icon);
                        return (
                            <div key={sport.name} aria-label={sport.name} className="group">
                                <div className="relative flex flex-col items-center gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-green-200">
                                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-50 ring-1 ring-green-100">
                                    {icon ? (
                                        <Image
                                        src={icon}
                                        alt={sport.name}
                                        width={80}
                                        height={80}
                                        className="h-[80px] w-[80px] object-contain transition group-hover:scale-[1.03]"
                                        />
                                    ) : (
                                        <div className="h-[80px] w-[80px]" />
                                    )}
                                    </div>
                                    <span className="text-sm font-semibold text-gray-800 text-center">{sport.name}</span>
                                    <div className="mt-1 h-px w-10 bg-gray-200" />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <p className="text-center mt-7 font-bold text-gray-500">
                    <Link href="/contacto" className="text-green-500 hover:underline">{t('contacta')}</Link> {t('contacta_nuevo_deporte')}
                </p>
            </div>

            {/* Bloque características */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-6 items-stretch rounded-xl bg-gray-100 my-8 py-8 px-6">
                {FEATURES.map((f) => (
                    <FeatureCard key={f.title} {...f} />
                ))}
            </div>
        </section>
    );
}
