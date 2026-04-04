/**
 * Simple in-process sliding-window rate limiter.
 *
 * Works correctly in single-process environments (local dev, single Node.js
 * server). For multi-instance or serverless deployments (e.g. Vercel
 * serverless functions), each invocation gets a fresh process and this store
 * resets. In those cases, swap the store Map for an external key-value store
 * such as Upstash Redis (@upstash/ratelimit) or a Supabase table.
 */

interface Entry {
  count: number;
  resetAt: number;
}

// Module-level store — shared across all requests in the same process.
const store = new Map<string, Entry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check whether `key` has exceeded `limit` requests within `windowMs`.
 * Increments the counter if the request is allowed.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/** Extract the best-effort client IP from a request's headers. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') ?? 'unknown';
}
