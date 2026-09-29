/* Simple IndexedDB helper for storing media offline */
import {
  idbClear,
  idbDelete,
  idbGetAllRecords,
  idbGetRecord,
  idbPutRecord,
} from '@/lib/mediaLocal';

export type StoredMedia = {
  id: string; // uuid or timestamp-based
  blob: Blob;
  mimeType: string;
  createdAt: number; // Date.now()
  name?: string;
};

export async function saveMedia(item: StoredMedia): Promise<void> {
  await idbPutRecord(item);
}

export async function getAllMedia(): Promise<StoredMedia[]> {
  return idbGetAllRecords();
}

export async function getMediaById(id: string): Promise<StoredMedia | undefined> {
  const row = await idbGetRecord(id);
  return row ?? undefined;
}

export async function deleteMedia(id: string): Promise<void> {
  await idbDelete(id);
}

export async function clearMedia(): Promise<void> {
  await idbClear();
}
