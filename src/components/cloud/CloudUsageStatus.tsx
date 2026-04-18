'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { formatBytes, getCloudUsageLevel } from '@/lib/cloud/guardrails';

type CloudUsageSnapshot = {
  bytes_used: number;
  bytes_quota: number;
  bytes_remaining: number;
  percentage_used: number;
  plan_gb: number;
};

type Props = {
  enabled: boolean;
};

export default function CloudUsageStatus({ enabled }: Props) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<CloudUsageSnapshot | null>(null);

  const loadUsage = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cloud/usage', { cache: 'no-store' });
      if (!res.ok) throw new Error('cloud_usage_error');
      const body = (await res.json()) as { usage?: CloudUsageSnapshot };
      if (body.usage) setUsage(body.usage);
    } catch {
      setError(t('cloud_usage_error'));
    } finally {
      setLoading(false);
    }
  }, [enabled, t]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  useEffect(() => {
    if (!enabled) return;
    const onRefresh = () => {
      void loadUsage();
    };
    window.addEventListener('focus', onRefresh);
    window.addEventListener('cloud-usage-refresh', onRefresh as EventListener);
    return () => {
      window.removeEventListener('focus', onRefresh);
      window.removeEventListener('cloud-usage-refresh', onRefresh as EventListener);
    };
  }, [enabled, loadUsage]);

  const level = useMemo(
    () => (usage ? getCloudUsageLevel(usage.percentage_used) : 'ok'),
    [usage]
  );

  if (!enabled) return null;

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-indigo-900">{t('cloud_usage_title')}</p>
        {loading && <span className="text-xs text-indigo-700">{t('cloud_usage_loading')}</span>}
      </div>

      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}

      {usage && (
        <>
          <p className="mt-2 text-xs text-indigo-800">
            {t('cloud_usage_used_of_total', {
              USED: formatBytes(usage.bytes_used),
              TOTAL: formatBytes(usage.bytes_quota),
              PERCENT: usage.percentage_used.toFixed(1),
            })}
          </p>
          <p className="mt-1 text-xs text-indigo-800">
            {t('cloud_usage_remaining', { REMAINING: formatBytes(usage.bytes_remaining) })}
          </p>

          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-indigo-100">
            <div
              className={[
                'h-full transition-all',
                level === 'full100'
                  ? 'bg-red-600'
                  : level === 'warn95'
                    ? 'bg-rose-500'
                    : level === 'warn85'
                      ? 'bg-amber-500'
                      : level === 'info70'
                        ? 'bg-yellow-500'
                        : 'bg-emerald-500',
              ].join(' ')}
              style={{ width: `${Math.min(100, Math.max(0, usage.percentage_used))}%` }}
            />
          </div>

          {level !== 'ok' && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <p className="font-medium">
                {level === 'info70' && t('cloud_usage_info_70')}
                {level === 'warn85' && t('cloud_usage_warn_85')}
                {level === 'warn95' && t('cloud_usage_warn_95')}
                {level === 'full100' && t('cloud_usage_full_100')}
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <Link href="/subscription/storage" className="underline">
                  {t('cloud_usage_cta_upgrade')}
                </Link>
                <Link href="/matches" className="underline">
                  {t('cloud_usage_cta_manage_files')}
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
