import { idbGet } from './mediaLocal';
import { supabaseBrowser } from './supabase/client';

type PendingItem = {
  id: string;        // media.id (uuid en BD)
  key: string;       // clave local en IDB
  matchId: string;
  ext: string;       // ".jpg" ".mp4" etc
  mime: string;
};

const QUEUE_KEY = 'media_pending_queue_v1';

function readQueue(): PendingItem[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}
function writeQueue(items: PendingItem[]) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(items)); } catch {}
}
export function enqueue(item: PendingItem) {
  const q = readQueue();
  q.push(item);
  writeQueue(q);
}
export function dequeue(id: string) {
  const q = readQueue().filter(x => x.id !== id);
  writeQueue(q);
}

export async function trySyncAll(): Promise<number> {
  const supabase = supabaseBrowser();
  const items = readQueue();
  let uploaded = 0;

  for (const it of items) {
    const blob = await idbGet(it.key);
    if (!blob) { dequeue(it.id); continue; }

    const path = `matches/${it.matchId}/${it.id}${it.ext}`;
    const { error: upErr } = await supabase.storage
      .from('matches')
      .upload(path, blob, { upsert: true, contentType: it.mime });

    if (upErr) continue;

    // Actualiza BD con storage_path + synced_at
    const { error: upDbErr } = await supabase
      .from('media')
      .update({ storage_path: path, synced_at: new Date().toISOString() })
      .eq('id', it.id);

    if (!upDbErr) {
      uploaded++;
      // Podrías borrar el blob local si quieres ahorrar espacio:
      // await idbDelete(it.key);
      dequeue(it.id);
    }
  }
  return uploaded;
}
