const REQUEST_LIMIT = 60;
const WINDOW_MS = 60 * 60 * 1000;

type Entry = { count: number; resetAt: number };

export class RateLimiter {
  private readonly map = new Map<string, Entry>();
  private nextCleanup = Date.now() + WINDOW_MS;

  check(userId: string): { allowed: boolean; retryAfter: number } {
    const now = Date.now();

    if (now >= this.nextCleanup) {
      for (const [key, entry] of this.map) {
        if (now >= entry.resetAt) this.map.delete(key);
      }
      this.nextCleanup = now + WINDOW_MS;
    }

    const current = this.map.get(userId);

    if (!current || now >= current.resetAt) {
      this.map.set(userId, { count: 1, resetAt: now + WINDOW_MS });
      return { allowed: true, retryAfter: 0 };
    }

    if (current.count >= REQUEST_LIMIT) {
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      };
    }

    current.count += 1;
    return { allowed: true, retryAfter: 0 };
  }
}

export const aiRateLimiter = new RateLimiter();
