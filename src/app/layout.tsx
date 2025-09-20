import './globals.css';
import { I18nProvider } from '@/i18n/I18nProvider';
import Navbar from '@/components/Navbar';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es">
            <body>
                <I18nProvider>
                    <Navbar />

                    <main className="mx-auto max-w-5xl px-6 py-10 mt-10">
                        {children}
                    </main>
                </I18nProvider>
            </body>
        </html>
    );
}


 