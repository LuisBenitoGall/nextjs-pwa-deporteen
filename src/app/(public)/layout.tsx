import { headers } from 'next/headers';
import Script from 'next/script';
import { createSupabaseServerClientReadOnly, getServerUser } from '@/lib/supabase/server';
import { userCanAccessAdminPanel } from '@/lib/auth/adminAccess';
import { getSubscriptionState } from '@/lib/subscriptions';
import { tServer } from '@/i18n/server';

// Components
import CookieBanner from '@/components/CookieBanner';
import InstallBanner from '@/components/InstallBanner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SubscriptionExpiredBanner from '@/components/SubscriptionExpiredBanner';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
    let user: Awaited<ReturnType<typeof getServerUser>>['user'] = null;
    try {
        const userResult = await getServerUser();
        user = userResult.user;
    } catch {
        user = null;
    }
    let serverIsAdmin = false;
    let showSubscriptionExpiredBanner = false;
    let subscriptionBannerMessage = '';
    let subscriptionBannerRenewLabel = '';

    if (user) {
        const supabase = await createSupabaseServerClientReadOnly();
        serverIsAdmin = await userCanAccessAdminPanel(supabase, user);

        const { isActiveSubscription } = await getSubscriptionState(user.id);
        if (!isActiveSubscription) {
            const { data: profile } = await supabase
                .from('users')
                .select('locale')
                .eq('id', user.id)
                .maybeSingle();
            const { t } = await tServer(profile?.locale ?? undefined);
            showSubscriptionExpiredBanner = true;
            subscriptionBannerMessage = t('suscripcion_vencida_banner');
            subscriptionBannerRenewLabel = t('renovar_ahora');
        }
    }

    const hdrs = await headers();
    const nonce = hdrs.get('x-nonce') ?? undefined;

    return (
        <>
            {showSubscriptionExpiredBanner ? (
                <SubscriptionExpiredBanner
                    message={subscriptionBannerMessage}
                    renewLabel={subscriptionBannerRenewLabel}
                />
            ) : null}
            <Navbar
                serverUserId={user?.id ?? null}
                serverIsAdmin={serverIsAdmin}
                hasSubscriptionBanner={showSubscriptionExpiredBanner}
            />
            <InstallBanner />

            <main
                className={`mx-auto w-full max-w-5xl px-6 py-10 flex-1 ${showSubscriptionExpiredBanner ? 'mt-20 sm:mt-[6.5rem]' : 'mt-10'}`}
            >
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
