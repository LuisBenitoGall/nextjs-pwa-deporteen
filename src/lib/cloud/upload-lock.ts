const lockStore = new Map<string, Promise<void>>();

export async function runWithKeyLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = lockStore.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  lockStore.set(key, previous.then(() => current));
  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (lockStore.get(key) === current) {
      lockStore.delete(key);
    }
  }
}
