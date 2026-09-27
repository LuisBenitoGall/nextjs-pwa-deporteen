export type MatchMediaUsageRow = {
  size_bytes?: number | null;
  storage_provider?: string | null;
  storage_path?: string | null;
};

export function isBillableRemoteMediaRow(row: MatchMediaUsageRow): boolean {
  const provider = row.storage_provider ?? null;
  if (provider === 'drive' || provider === 'local') return false;
  if (provider === 'r2' || provider === 'supabase') return true;
  const path = row.storage_path ?? '';
  if (path.startsWith('drive:')) return false;
  if (path.startsWith('r2:')) return true;
  return !!path && !path.startsWith('drive:');
}

export function sumBillableRemoteBytes(rows: MatchMediaUsageRow[]): number {
  return rows.filter(isBillableRemoteMediaRow).reduce((sum, row) => sum + (row.size_bytes ?? 0), 0);
}
