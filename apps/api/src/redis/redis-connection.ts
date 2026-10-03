import { Redis } from "ioredis"

/**
 * BullMQ in a native ESM app needs an already-constructed ioredis client
 * rather than a plain `{ url }` options object, since passing options directly
 * fails at runtime ("pass an already-constructed client instance instead of
 * connection options"). `maxRetriesPerRequest: null` is BullMQ's own
 * requirement for any connection it drives (required for blocking commands).
 */
export function createRedisConnection() {
  return new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  })
}
