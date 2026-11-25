/**
 * Fixed-window in-memory rate limiter.
 *
 * Best effort only: on serverless platforms each instance keeps its own
 * counters. It is sufficient to slow down naive abuse of the public form and
 * brute-force on the admin login; swap for a shared store (e.g. Upstash Redis)
 * if stronger guarantees are needed.
 */
export interface RateLimiter {
  /** Returns true when the call is allowed. */
  check(key: string): boolean;
  reset(key: string): void;
}

export function createRateLimiter(limit: number, windowMs: number, now = () => Date.now()): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key) {
      const t = now();
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= t) {
        hits.set(key, { count: 1, resetAt: t + windowMs });
        if (hits.size > 10_000) {
          for (const [k, v] of hits) if (v.resetAt <= t) hits.delete(k);
        }
        return true;
      }
      entry.count += 1;
      return entry.count <= limit;
    },
    reset(key) {
      hits.delete(key);
    },
  };
}
