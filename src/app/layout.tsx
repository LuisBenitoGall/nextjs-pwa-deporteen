import './globals.css';
import { headers } from 'next/headers';
import Script from 'next/script';
import { I18nProvider } from '@/i18n/I18nProvider';
import { getServerUser } from '@/lib/supabase/server';
import { ToastProvider } from '@/components/ui/toast';
import type { Metadata, Viewport } from 'next';

//Components
import CookieBanner from '@/components/CookieBanner';
import InstallBanner from '@/components/InstallBanner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';

export const metadata: Metadata = {
  title: 'DeporTeen',
  description: 'Resultados y estadísticas para familias y clubs.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' }
    ],
    apple: [{ url: '/icons/apple-touch-icon-180.png', sizes: '180x180' }]
  }
};

export const viewport: Viewport = { themeColor: '#0EA5E9' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const { user } = await getServerUser();
    
    // ✅ En Next 15, headers() es asíncrono
    const hdrs = await headers();
    const nonce = hdrs.get('x-nonce') ?? undefined;

    return (
        <html lang="es">
            <body className="min-h-screen flex flex-col">
                <I18nProvider>
                    <ToastProvider>
                        <ServiceWorkerRegistrar />
                        <Navbar serverUserId={user?.id ?? null} />

                        <InstallBanner />

                        <main className="mx-auto w-full max-w-5xl px-6 py-10 mt-10 flex-1">
                            <div className="mx-auto w-full max-w-3xl">
                                {children}
                            </div>

                            <Script id="metrics-inline" nonce={nonce}>
                                {`window.__metrics = window.__metrics || {};`}
                            </Script>

                            {/** El registro del SW ahora se realiza vía componente cliente */}
                        </main>

                        <Footer />
                        <CookieBanner />
                    </ToastProvider>

                    <Script id="gtag-init" strategy="afterInteractive">
                    {`
                    (function() {
                        try {
                        var c = JSON.parse(decodeURIComponent(document.cookie.split('; ').find(x=>x.startsWith('dp_consent_v1='))?.split('=')[1]||'null'));
                        var ok = c && (c.analitica || c.marketing);
                        if (!ok) return;
                        var s = document.createElement('script'); s.src='https://www.googletagmanager.com/gtag/js?id=G-XXXX'; s.async=true; document.head.appendChild(s);
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);} window.gtag = gtag;
                        gtag('js', new Date()); gtag('config','G-XXXX',{ anonymize_ip: true });
                        } catch(e) {}
                    })();
                    `}
                    </Script>
                </I18nProvider>
            </body>
        </html>
    );
}
