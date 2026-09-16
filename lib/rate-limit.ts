import { redis } from './redis';

const memoryStore = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<boolean> {
  const now = Date.now();

  try {
    const r = redis();
    const rk = `rl:${key}`;
    const count = await r.incr(rk);
    if (count === 1) await r.expire(rk, windowSec);
    return count <= limit;
  } catch {
    const entry = memoryStore.get(key);
    if (!entry || entry.resetAt < now) {
      memoryStore.set(key, { count: 1, resetAt: now + windowSec * 1000 });
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  }
}
