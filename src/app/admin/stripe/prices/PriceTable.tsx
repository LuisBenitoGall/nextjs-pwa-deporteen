'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, ExternalLink, Archive, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

type Interval = 'day' | 'week' | 'month' | 'year';

const PAGE_SIZE = 10;
const CURRENCIES = ['eur', 'usd', 'gbp', 'mxn'] as const;
const INTERVALS: Interval[] = ['month', 'year', 'week', 'day'];

export interface PriceRow {
  id: string;
  productId: string;
  productName: string | null;
  productDeleted: boolean;
  amountDisplay: string;
  unitAmount: number | null;
  currency: string;
  typeDisplay: string;
  type: 'one_time' | 'recurring';
  interval: Interval | null;
  active: boolean;
  dashboardUrl: string;
  nickname: string | null;
}

export interface PriceTableLabels {
  product: string;
  productId: string;
  deleted: string;
  amount: string;
  amountHint: string;
  currencyLabel: string;
  currencyHint: string;
  type: string;
  typeLabel: string;
  typeHint: string;
  typeOneTime: string;
  typeRecurring: string;
  intervalLabel: string;
  intervalLabels: Record<Interval, string>;
  status: string;
  actions: string;
  view: string;
  manageButton: string;
  manageTitle: string;
  manageSubtitle: string;
  nicknameLabel: string;
  nicknamePlaceholder: string;
  manageSave: string;
  manageCancel: string;
  activeBadge: string;
  inactiveBadge: string;
  updateError: string;
  manageStatusLabel: string;
  manageStatusHint: string;
  archive: string;
  activate: string;
  confirmArchiveTitle: string;
  confirmArchiveDescription: string;
  confirmArchiveConfirm: string;
  confirmArchiveCancel: string;
  replaceButton: string;
  replaceTitle: string;
  replaceDescription: string;
  replaceSubmit: string;
  replaceCancel: string;
  replaceError: string;
  paginationPrevious: string;
  paginationNext: string;
}

interface PriceTableProps {
  rows: PriceRow[];
  labels: PriceTableLabels;
}

export default function PriceTable({ rows, labels }: PriceTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const [manageRow, setManageRow] = useState<PriceRow | null>(null);
  const [manageNickname, setManageNickname] = useState('');
  const [manageActive, setManageActive] = useState(true);
  const [manageSaving, setManageSaving] = useState(false);

  const [archiveRow, setArchiveRow] = useState<PriceRow | null>(null);
  const [archiving, setArchiving] = useState(false);

  const [replaceRow, setReplaceRow] = useState<PriceRow | null>(null);
  const [replaceAmount, setReplaceAmount] = useState('');
  const [replaceCurrency, setReplaceCurrency] = useState<(typeof CURRENCIES)[number]>('eur');
  const [replaceType, setReplaceType] = useState<'one_time' | 'recurring'>('one_time');
  const [replaceInterval, setReplaceInterval] = useState<Interval>('month');
  const [replaceSaving, setReplaceSaving] = useState(false);
  const [replaceError, setReplaceError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  const paginatedRows = useMemo(() => {
    const start = page * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  function openManage(row: PriceRow) {
    setManageRow(row);
    setManageNickname(row.nickname ?? '');
    setManageActive(row.active);
    setError(null);
  }

  function closeManage() {
    setManageRow(null);
    setManageSaving(false);
    setError(null);
  }

  function openArchive(row: PriceRow) {
    setArchiveRow(row);
    setArchiving(false);
    setError(null);
  }

  function closeArchive() {
    setArchiveRow(null);
    setArchiving(false);
  }

  function openReplace(row: PriceRow) {
    setReplaceRow(row);
    setReplaceAmount(row.unitAmount !== null ? String(row.unitAmount) : '');
    setReplaceCurrency((row.currency?.toLowerCase() as (typeof CURRENCIES)[number]) || 'eur');
    setReplaceType(row.type);
    setReplaceInterval(row.interval ?? 'month');
    setReplaceSaving(false);
    setReplaceError(null);
    setError(null);
  }

  function closeReplace() {
    setReplaceRow(null);
    setReplaceSaving(false);
    setReplaceError(null);
    setReplaceAmount('');
    setReplaceCurrency('eur');
    setReplaceType('one_time');
    setReplaceInterval('month');
  }

  async function updatePrice(row: PriceRow, payload: Record<string, unknown>) {
    const res = await fetch('/api/admin/stripe/prices', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId: row.id, ...payload }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || labels.updateError);
    }
  }

  async function setActive(row: PriceRow, desiredActive: boolean) {
    setLoadingId(row.id);
    try {
      await updatePrice(row, { active: desiredActive });
      router.refresh();
      return true;
    } catch (err: any) {
      setError(err?.message || labels.updateError);
      return false;
    } finally {
      setLoadingId(null);
    }
  }

  async function handleManageSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!manageRow) return;
    setManageSaving(true);
    setError(null);
    try {
      await updatePrice(manageRow, {
        active: manageActive,
        nickname: manageNickname.trim() === '' ? null : manageNickname.trim(),
      });
      closeManage();
      router.refresh();
    } catch (err: any) {
      setError(err?.message || labels.updateError);
      setManageSaving(false);
    }
  }

  async function handleReplaceSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!replaceRow) return;

    const numericAmount = Number(replaceAmount.replace(',', '.'));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setReplaceError(labels.replaceError);
      return;
    }

    setReplaceSaving(true);
    setReplaceError(null);

    try {
      const res = await fetch('/api/admin/stripe/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: replaceRow.productId,
          amount: numericAmount,
          currency: replaceCurrency,
          type: replaceType,
          interval: replaceType === 'recurring' ? replaceInterval : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || labels.replaceError);
      }

      await updatePrice(replaceRow, { active: false });
      closeReplace();
      router.refresh();
    } catch (err: any) {
      setReplaceError(err?.message || labels.replaceError);
      setReplaceSaving(false);
    }
  }

  async function handleArchiveConfirm() {
    if (!archiveRow) return;
    setArchiving(true);
    const success = await setActive(archiveRow, false);
    setArchiving(false);
    if (success) {
      closeArchive();
    }
  }

  return (
    <TooltipProvider>
      <div className="w-full rounded-xl border border-slate-700 bg-slate-900/60 p-6 shadow">
        {error && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mx-auto max-w-5xl space-y-5">
          {paginatedRows.map((row) => (
            <article
              key={row.id}
              className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-6 shadow-sm transition hover:border-emerald-500/40"
            >
              <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {labels.product}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold text-slate-50">
                      {row.productName ?? labels.deleted}
                    </span>
                    {row.nickname && (
                      <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
                        {row.nickname}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="font-mono">{row.productId}</span>
                    <span className="hidden h-1 w-1 rounded-full bg-slate-700 md:inline" />
                    <span className="font-mono">{row.id}</span>
                  </div>
                </div>

                <span
                  className={cn(
                    'inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide',
                    row.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'
                  )}
                >
                  {row.active ? labels.activeBadge : labels.inactiveBadge}
                </span>
              </header>

              <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <dl className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4">
                    <dt className="text-xs uppercase tracking-wide text-slate-500">{labels.amount}</dt>
                    <dd className="mt-2 text-xl font-semibold text-slate-50">{row.amountDisplay}</dd>
                    <dd className="mt-1 text-xs text-slate-500">{row.currency?.toUpperCase()}</dd>
                  </dl>

                  <dl className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4">
                    <dt className="text-xs uppercase tracking-wide text-slate-500">{labels.type}</dt>
                    <dd className="mt-2 text-sm text-slate-200">{row.typeDisplay}</dd>
                    {row.type === 'recurring' && row.interval && (
                      <dd className="mt-1 text-xs text-slate-500">
                        {labels.intervalLabel}: {labels.intervalLabels[row.interval] ?? row.interval}
                      </dd>
                    )}
                  </dl>
                </div>

                <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{labels.actions}</p>
                  <div className="mt-3 flex flex-col gap-2" aria-label={labels.actions}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          className="w-full justify-center bg-slate-800 text-slate-100 hover:bg-slate-700"
                          onClick={() => openManage(row)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span>{labels.manageButton}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{labels.manageButton}</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="w-full justify-center border-emerald-500 text-emerald-300 hover:bg-emerald-500/10"
                          onClick={() => openReplace(row)}
                        >
                          <RotateCcw className="h-4 w-4" />
                          <span>{labels.replaceButton}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{labels.replaceButton}</TooltipContent>
                    </Tooltip>

                    {row.active ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={loadingId === row.id}
                            onClick={() => openArchive(row)}
                            className="w-full justify-center"
                          >
                            <Archive className="h-4 w-4" />
                            <span>{labels.archive}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{labels.archive}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={loadingId === row.id}
                            onClick={() => setActive(row, true)}
                            className="w-full justify-center bg-slate-800 text-slate-100 hover:bg-slate-700"
                          >
                            <RotateCcw className="h-4 w-4" />
                            <span>{labels.activate}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{labels.activate}</TooltipContent>
                      </Tooltip>
                    )}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button asChild variant="outline" size="sm" aria-label={labels.view}>
                          <a
                            href={row.dashboardUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex w-full items-center justify-center gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>{labels.view}</span>
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{labels.view}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>
            Página {page + 1} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={page === 0}
            >
              {labels.paginationPrevious}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
              disabled={page >= totalPages - 1}
            >
              {labels.paginationNext}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={Boolean(manageRow)} onOpenChange={(open) => (open ? undefined : closeManage())}>
        <DialogContent className="bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>{labels.manageTitle}</DialogTitle>
            <DialogDescription>{labels.manageSubtitle}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleManageSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manage-nickname">{labels.nicknameLabel}</Label>
              <Input
                id="manage-nickname"
                value={manageNickname}
                onChange={(event) => setManageNickname(event.target.value)}
                placeholder={labels.nicknamePlaceholder}
              />
            </div>

            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">{labels.manageStatusLabel}</p>
                  <p className="text-xs text-slate-400">{labels.manageStatusHint}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={manageActive}
                  onClick={() => setManageActive((prev) => !prev)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition',
                    manageActive ? 'bg-emerald-500' : 'bg-slate-600'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-5 w-5 transform rounded-full bg-white transition',
                      manageActive ? 'translate-x-5' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={closeManage} className="text-slate-300 hover:text-white">
                {labels.manageCancel}
              </Button>
              <Button type="submit" disabled={manageSaving} className="bg-emerald-500 text-white hover:bg-emerald-500/90">
                {manageSaving ? '...' : labels.manageSave}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(replaceRow)} onOpenChange={(open) => (open ? undefined : closeReplace())}>
        <DialogContent className="bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>{labels.replaceTitle}</DialogTitle>
            <DialogDescription>{labels.replaceDescription}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReplaceSubmit} className="space-y-4">
            {replaceError && (
              <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {replaceError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="replace-amount">{labels.amount}</Label>
              <Input
                id="replace-amount"
                type="number"
                min="0"
                step="0.01"
                value={replaceAmount}
                onChange={(event) => setReplaceAmount(event.target.value)}
                placeholder="19.99"
              />
              <p className="text-xs text-slate-400">{labels.amountHint}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="replace-currency">{labels.currencyLabel}</Label>
                <select
                  id="replace-currency"
                  value={replaceCurrency}
                  onChange={(event) => setReplaceCurrency(event.target.value as (typeof CURRENCIES)[number])}
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency.toUpperCase()}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400">{labels.currencyHint}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="replace-type">{labels.typeLabel}</Label>
                <select
                  id="replace-type"
                  value={replaceType}
                  onChange={(event) =>
                    setReplaceType(event.target.value === 'recurring' ? 'recurring' : 'one_time')
                  }
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <option value="one_time">{labels.typeOneTime}</option>
                  <option value="recurring">{labels.typeRecurring}</option>
                </select>
                <p className="text-xs text-slate-400">{labels.typeHint}</p>
              </div>
            </div>

            {replaceType === 'recurring' && (
              <div className="space-y-2">
                <Label htmlFor="replace-interval">{labels.intervalLabel}</Label>
                <select
                  id="replace-interval"
                  value={replaceInterval}
                  onChange={(event) => setReplaceInterval(event.target.value as Interval)}
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  {INTERVALS.map((interval) => (
                    <option key={interval} value={interval}>
                      {labels.intervalLabels[interval]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={closeReplace} className="text-slate-300 hover:text-white">
                {labels.replaceCancel}
              </Button>
              <Button type="submit" disabled={replaceSaving} className="bg-emerald-500 text-white hover:bg-emerald-500/90">
                {replaceSaving ? '...' : labels.replaceSubmit}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(archiveRow)} onOpenChange={(open) => (open ? undefined : closeArchive())}>
        <DialogContent className="bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>{labels.confirmArchiveTitle}</DialogTitle>
            <DialogDescription>{labels.confirmArchiveDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={closeArchive} className="text-slate-300 hover:text-white">
              {labels.confirmArchiveCancel}
            </Button>
            <Button type="button" variant="destructive" onClick={handleArchiveConfirm} disabled={archiving}>
              {archiving ? '...' : labels.confirmArchiveConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
