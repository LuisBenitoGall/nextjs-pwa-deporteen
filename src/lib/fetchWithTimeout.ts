const DEFAULT_UPLOAD_TIMEOUT_MS = 120_000;

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_UPLOAD_TIMEOUT_MS
): Promise<Response> {
  const signal =
    init.signal ??
    (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
      ? AbortSignal.timeout(timeoutMs)
      : undefined);

  try {
    return await fetch(input, { ...init, signal });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new Error('UPLOAD_TIMEOUT');
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('UPLOAD_TIMEOUT');
    }
    throw err;
  }
}

export { DEFAULT_UPLOAD_TIMEOUT_MS };
