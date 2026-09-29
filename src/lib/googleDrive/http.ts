import 'server-only';

const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);

type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterMs?: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelay(attempt: number, opts: Required<RetryOptions>) {
  const expDelay = Math.min(opts.maxDelayMs, opts.baseDelayMs * 2 ** attempt);
  const jitter = Math.floor(Math.random() * opts.jitterMs);
  return expDelay + jitter;
}

export function isRetryableDriveStatus(status: number) {
  return RETRYABLE_STATUS.has(status);
}

export async function fetchGoogleWithRetry(
  input: string,
  init: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  const opts: Required<RetryOptions> = {
    retries: options?.retries ?? 3,
    baseDelayMs: options?.baseDelayMs ?? 300,
    maxDelayMs: options?.maxDelayMs ?? 2500,
    jitterMs: options?.jitterMs ?? 200,
  };

  for (let attempt = 0; attempt <= opts.retries; attempt += 1) {
    try {
      const response = await fetch(input, init);
      if (!isRetryableDriveStatus(response.status) || attempt === opts.retries) {
        return response;
      }
    } catch (error) {
      if (attempt === opts.retries) {
        throw error;
      }
    }

    await sleep(getRetryDelay(attempt, opts));
  }

  throw new Error('Google request retry exhausted');
}
