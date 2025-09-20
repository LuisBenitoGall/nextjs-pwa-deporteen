'use client';
import { useT } from '@/i18n/I18nProvider';
import Link from 'next/link'

export default function HeroSection() {
    const t = useT();

    return (
        <section className="px-6 pb-20 pt-8">
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
                </div>

                {/* Imagen ilustrativa */}
                <div className="flex justify-center md:justify-end">
                    <img
                        src="img/balls.jpg"
                        alt={t('alt_hero_image')}
                        className="w-full max-w-md rounded-xl shadow-lg"
                    />
                </div>
            </div>
        </section>
    );
}
