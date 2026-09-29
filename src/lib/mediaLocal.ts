// Shared IndexedDB wrapper for offline media cache.
const DB_NAME = 'pwa-esports-media';
const DB_VERSION = 2;
const STORE = 'media';
let dbPromise: Promise<IDBDatabase> | null = null;

type StoredBlobRecord = {
  id: string;
  blob: Blob;
  mimeType?: string;
  createdAt?: number;
  name?: string;
};

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function idbPut(key: string, blob: Blob): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({
      id: key,
      blob,
      mimeType: blob.type || 'application/octet-stream',
      createdAt: Date.now(),
    } as StoredBlobRecord);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGet(key: string): Promise<Blob | null> {
  const db = await openDB();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => {
      const value = req.result as StoredBlobRecord | Blob | undefined;
      if (!value) {
        resolve(null);
        return;
      }
      if (value instanceof Blob) {
        resolve(value);
        return;
      }
      resolve(value.blob ?? null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function idbDelete(key: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbPutRecord(record: StoredBlobRecord): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGetRecord(key: string): Promise<StoredBlobRecord | null> {
  const db = await openDB();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => {
      const value = req.result as StoredBlobRecord | Blob | undefined;
      if (!value) {
        resolve(null);
        return;
      }
      if (value instanceof Blob) {
        resolve({
          id: key,
          blob: value,
          mimeType: value.type || 'application/octet-stream',
          createdAt: Date.now(),
        });
        return;
      }
      resolve(value);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function idbGetAllRecords(): Promise<StoredBlobRecord[]> {
  const db = await openDB();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const rows: StoredBlobRecord[] = [];
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve(rows);
        return;
      }
      const value = cursor.value as StoredBlobRecord | Blob | undefined;
      if (value instanceof Blob) {
        rows.push({
          id: String(cursor.key),
          blob: value,
          mimeType: value.type || 'application/octet-stream',
          createdAt: Date.now(),
        });
      } else if (value) {
        rows.push(value);
      }
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function idbClear(): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
