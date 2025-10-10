'use client';
import { useState, useEffect } from 'react';
import { useT, useLocale } from '@/i18n/I18nProvider';
import { LIMITS } from '@/config/constants';

// Components
import TitleH1 from '../../../components/TitleH1';

export default function Page() {
    const t = useT();

    return (
        <div>
            <TitleH1>{t('politica_cookies')}</TitleH1>


            <p>Contenido pendiente.</p>
        </div>
    );
}
