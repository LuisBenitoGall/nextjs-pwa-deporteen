'use client';
import { useState, useEffect } from 'react';
import { useT, useLocale } from '@/i18n/I18nProvider';
import { LIMITS } from '@/config/constants';

// Components
import LegalDoc from '@/components/LegalDoc';
import TitleH1 from '../../../components/TitleH1';

export default function Page() {
    const t = useT();

    return (
        <div>
            <TitleH1>{t('aviso_legal')}</TitleH1>

            <LegalDoc doc="legal_notice" />           
        </div>
    );
}
