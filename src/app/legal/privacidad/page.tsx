'use client';
import { useT } from '@/i18n/I18nProvider';

// Components
import LegalDoc from '@/components/LegalDoc';
import TitleH1 from '../../../components/TitleH1';

export default function Page() {
    const t = useT();

    return (
        <div>
            <TitleH1>{t('politica_privacidad')}</TitleH1>

            <LegalDoc doc="privacy" />
        </div>
    );
}
