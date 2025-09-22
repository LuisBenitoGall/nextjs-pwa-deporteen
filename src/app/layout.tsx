import './globals.css';
import { headers } from 'next/headers';
import Script from 'next/script';
import { I18nProvider } from '@/i18n/I18nProvider';
import Navbar from '@/components/Navbar';
import { getServerUser } from '@/lib/supabase/server';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const { user } = await getServerUser();
    
    // ✅ En Next 15, headers() es asíncrono
    const hdrs = await headers();
    const nonce = hdrs.get('x-nonce') ?? undefined;

    return (
        <html lang="es">
            <body>
                <I18nProvider>
                    <Navbar serverUserId={user?.id ?? null} />

                    <main className="mx-auto max-w-5xl px-6 py-10 mt-10">
                        {children}

                        <Script id="metrics-inline" nonce={nonce}>
                            {`window.__metrics = window.__metrics || {};`}
                        </Script>
                    </main>
                </I18nProvider>
            </body>
        </html>
    );
}


 