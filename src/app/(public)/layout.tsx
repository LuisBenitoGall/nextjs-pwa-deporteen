import { headers } from 'next/headers';
import Script from 'next/script';
import { createSupabaseServerClientReadOnly, getServerUser } from '@/lib/supabase/server';
import { userCanAccessAdminPanel } from '@/lib/auth/adminAccess';

// Components
import CookieBanner from '@/components/CookieBanner';
import InstallBanner from '@/components/InstallBanner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
    let user: Awaited<ReturnType<typeof getServerUser>>['user'] = null;
    try {
        const userResult = await getServerUser();
        user = userResult.user;
    } catch {
        user = null;
    }
    let serverIsAdmin = false;
    if (user) {
        const supabase = await createSupabaseServerClientReadOnly();
        serverIsAdmin = await userCanAccessAdminPanel(supabase, user);
    }

    const hdrs = await headers();
    const nonce = hdrs.get('x-nonce') ?? undefined;

    return (
        <>
            <Navbar serverUserId={user?.id ?? null} serverIsAdmin={serverIsAdmin} />
            <InstallBanner />

            <main className="mx-auto w-full max-w-5xl px-6 py-10 mt-10 flex-1">
                <div className="mx-auto w-full max-w-3xl">
                    {children}
                </div>

                <Script id="metrics-inline" nonce={nonce}>
                    {`window.__metrics = window.__metrics || {};`}
                </Script>
            </main>

            <Footer />
            <CookieBanner />
        </>
    );
}
