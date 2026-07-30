import { Redis } from "@upstash/redis";

let redisInstance: Redis | null = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redisInstance = Redis.fromEnv();
  }
} catch (error) {
  console.warn("[REDIS] Failed to initialize Upstash Redis client:", error);
}

export const redis = redisInstance;
