import { idbGet } from './mediaLocal';
import { supabaseBrowser } from './supabase/client';
import { guessExt } from './uploadMatchMedia';

type PendingItem = {
  id: string;
  key: string;
  matchId: string;
  ext: string;
  mime: string;
  userId?: string;
};

const QUEUE_KEY = 'media_pending_queue_v1';

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
}

export function dequeue(id: string) {
  const q = readQueue().filter((x) => x.id !== id);
  writeQueue(q);
}

export async function trySyncAll(): Promise<number> {
  const supabase = supabaseBrowser();
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData?.user?.id;
  if (!uid) return 0;

  const items = readQueue();
  let uploaded = 0;

  for (const it of items) {
    const blob = await idbGet(it.key);
    if (!blob) {
      dequeue(it.id);
      continue;
    }

    const ext = it.ext || guessExt(it.mime) || '.bin';
    const storagePath = `${uid}/matches/${it.matchId}/${it.id}${ext}`;
    const { error: upErr } = await supabase.storage
      .from('matches')
      .upload(storagePath, blob, { upsert: true, contentType: it.mime });

    if (upErr) continue;

    const { error: upDbErr } = await supabase
      .from('match_media')
      .update({ storage_path: storagePath, synced_at: new Date().toISOString() })
      .eq('id', it.id);

    if (!upDbErr) {
      uploaded++;
      dequeue(it.id);
    }
  }
  return uploaded;
}

let syncListenerBound = false;

/** Registra reintentos al volver online (idempotente). */
export function bindMediaSyncOnOnline(): void {
  if (typeof window === 'undefined' || syncListenerBound) return;
  syncListenerBound = true;

  const run = () => {
    void trySyncAll().catch(() => {});
  };

  window.addEventListener('online', run);
  if (navigator.onLine) run();
}
