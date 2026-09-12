// Minimal in-memory rate limiter + bounded-queue helpers.
//
// NOTE: single-process only. If you run multiple app replicas, move this to
// Redis/database-backed limiting.

const buckets = new Map<string, number[]>();

/** Sliding-window check. Returns true if allowed (and records the hit). */
export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const cutoff = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  // Opportunistic cleanup to bound memory.
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      if (v.length === 0 || v[v.length - 1] <= cutoff) buckets.delete(k);
      if (buckets.size <= 5_000) break;
    }
  }
  return true;
}

export function resetRateLimitsForTests() {
  buckets.clear();
}
