import { idbGet } from './mediaLocal';
import { supabaseBrowser } from './supabase/client';
import { fetchWithTimeout } from './fetchWithTimeout';

type PendingItem = {
  id: string;
  key: string;
  matchId: string;
  ext: string;
  mime: string;
  userId?: string;
  playerId?: string | null;
};

const QUEUE_KEY = 'media_pending_queue_v1';

export type MediaSyncResult = {
  uploaded: number;
  failed: number;
  remaining: number;
};

function readQueue(): PendingItem[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeQueue(items: PendingItem[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota */
  }
}

export function enqueue(item: PendingItem) {
  const q = readQueue();
  q.push(item);
  writeQueue(q);
  void requestBackgroundMediaSync();
}

export function dequeue(id: string) {
  const q = readQueue().filter((x) => x.id !== id);
  writeQueue(q);
}

async function resolveStorageProvider(): Promise<'local' | 'supabase' | 'r2' | 'drive'> {
  try {
    const res = await fetch('/api/storage/provider', { cache: 'no-store' });
    if (!res.ok) return 'local';
    const json = (await res.json()) as { provider?: string };
    const p = json.provider;
    if (p === 'r2' || p === 'supabase' || p === 'drive' || p === 'local') return p;
    return 'local';
  } catch {
    return 'local';
  }
}

/** Subida remota facturable: siempre vía API (suscripción + cuota en servidor). */
async function uploadQueuedToRemote(it: PendingItem, blob: Blob): Promise<boolean> {
  const file = new File([blob], `sync${it.ext || '.bin'}`, { type: it.mime || 'application/octet-stream' });
  const form = new FormData();
  form.append('file', file);
  form.append('matchId', it.matchId);
  form.append('mediaId', it.id);
  form.append('device_uri', it.key);
  if (it.playerId) form.append('playerId', it.playerId);

  const res = await fetchWithTimeout('/api/remote-media/upload', { method: 'POST', body: form });
  if (res.ok) return true;

  const payload = await res.json().catch(() => ({} as { code?: string; error?: string }));
  if (payload.code === 'MATCH_MEDIA_INSERT_FAILED' || String(payload.error || '').includes('duplicate')) {
    return true;
  }
  return false;
}

export async function trySyncAll(): Promise<MediaSyncResult> {
  const supabase = supabaseBrowser();
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData?.user?.id;
  if (!uid) return { uploaded: 0, failed: 0, remaining: readQueue().length };

  const provider = await resolveStorageProvider();
  const items = readQueue();
  let uploaded = 0;
  let failed = 0;

  for (const it of items) {
    const blob = await idbGet(it.key);
    if (!blob) {
      dequeue(it.id);
      continue;
    }

    let ok = false;
    if (provider === 'r2' || provider === 'supabase') {
      ok = await uploadQueuedToRemote(it, blob);
    } else {
      failed++;
      continue;
    }

    if (ok) {
      uploaded++;
      dequeue(it.id);
    } else {
      failed++;
    }
  }

  const remaining = readQueue().length;
  const result = { uploaded, failed, remaining };

  if (typeof window !== 'undefined' && (failed > 0 || remaining > 0)) {
    window.dispatchEvent(new CustomEvent('media-sync-status', { detail: result }));
  }

  return result;
}

/** Pide al SW reintentar sync y ejecuta cola en foreground. */
export async function requestBackgroundMediaSync(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg && 'sync' in reg) {
      await (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(
        'media-sync'
      );
    }
  } catch {
    /* Background Sync no soportado */
  }

  void trySyncAll().catch(() => {});
}

let syncListenerBound = false;

export function bindMediaSyncOnOnline(): void {
  if (typeof window === 'undefined' || syncListenerBound) return;
  syncListenerBound = true;

  const run = () => {
    void requestBackgroundMediaSync();
  };

  window.addEventListener('online', run);

  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'MEDIA_SYNC') run();
    });
  }

  if (navigator.onLine) run();
}
