import { redis } from "./redis";
import { createHash } from "crypto";

export function generateCacheKey(prefix: string, input: unknown): string {
  const str = typeof input === "string" ? input : JSON.stringify(input);
  const hash = createHash("sha256").update(str).digest("hex");
  return `${prefix}:${hash}`;
}

export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  if (!redis) {
    console.log(`[CACHE MISS] ${key}`);
    return fetcher();
  }

  try {
    const cached = await redis.get<T>(key);
    if (cached !== null && cached !== undefined) {
      console.log(`[CACHE HIT] ${key}`);
      return cached;
    }
  } catch (error) {
    console.error(`[CACHE ERROR] Failed to read key "${key}":`, error);
  }

  console.log(`[CACHE MISS] ${key}`);
  const result = await fetcher();

  try {
    if (redis) {
      await redis.set(key, result, { ex: ttlSeconds });
    }
  } catch (error) {
    console.error(`[CACHE ERROR] Failed to set key "${key}":`, error);
  }

  return result;
}

export async function invalidate(key: string): Promise<void> {
  console.log(`[CACHE INVALIDATE] ${key}`);
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (error) {
    console.error(`[CACHE ERROR] Failed to invalidate key "${key}":`, error);
  }
}
