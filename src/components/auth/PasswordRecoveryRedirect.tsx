'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  buildResetPasswordPath,
  hashIndicatesRecovery,
  isPasswordRecoveryExemptPath,
  shouldRedirectPkceRecovery,
} from '@/lib/auth/passwordRecoveryRedirect';

/**
 * Corrige enlaces de recuperación que apuntan al Site URL (/) en lugar de /auth/reset-password.
 */
export default function PasswordRecoveryRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const hasCode = searchParams.has('code');
    if (shouldRedirectPkceRecovery(pathname, hasCode)) {
      router.replace(buildResetPasswordPath(searchParams));
      return;
    }

    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (!isPasswordRecoveryExemptPath(pathname) && hashIndicatesRecovery(hash)) {
      router.replace(buildResetPasswordPath(searchParams, hash));
    }
  }, [pathname, searchParams, router]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'PASSWORD_RECOVERY') return;
      const path = typeof window !== 'undefined' ? window.location.pathname : pathname;
      if (path === '/auth/reset-password') return;
      const params = new URLSearchParams(
        typeof window !== 'undefined' ? window.location.search.slice(1) : searchParams.toString()
      );
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      router.replace(buildResetPasswordPath(params, hash));
    });
    return () => subscription.unsubscribe();
  }, [pathname, searchParams, router]);

  return null;
}