import Redis from 'ioredis';
import crypto from 'crypto';

const REDIS_URL = process.env.REDIS_URL;

// In-memory fallback lock table when Redis service is not active
class MemoryLockManager {
  private locks: Map<string, { token: string; expiresAt: number }> = new Map();

  async acquire(key: string, token: string, ttlMs: number): Promise<boolean> {
    const now = Date.now();
    const existing = this.locks.get(key);

    if (existing && existing.expiresAt > now) {
      return false; // Still held
    }

    this.locks.set(key, { token, expiresAt: now + ttlMs });
    return true;
  }

  async release(key: string, token: string): Promise<boolean> {
    const existing = this.locks.get(key);
    if (!existing) return true;
    if (existing.token === token) {
      this.locks.delete(key);
      return true;
    }
    return false;
  }

  async set(key: string, value: string): Promise<void> {
    this.locks.set(key, { token: value, expiresAt: Date.now() + 86400000 });
  }

  async get(key: string): Promise<string | null> {
    const item = this.locks.get(key);
    if (!item || item.expiresAt <= Date.now()) {
      return null;
    }
    return item.token;
  }
}

const memoryLock = new MemoryLockManager();

let isRedisConnected = false;
let redisClient: Redis | null = null;

if (REDIS_URL) {
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) {
          return null; // Stop reconnecting spam if no redis instance is found
        }
        return Math.min(times * 100, 1000);
      },
      lazyConnect: true,
      connectTimeout: 2000,
    });

    redisClient.on('connect', () => {
      isRedisConnected = true;
      console.log('👾 [ARCADE REDIS] Connected to Redis server successfully!');
    });

    redisClient.on('error', () => {
      if (isRedisConnected) {
        console.warn('⚠️ [ARCADE REDIS] Redis connection lost, switching to memory mutex lock.');
      }
      isRedisConnected = false;
    });

    // Attempt initial connect asynchronously
    redisClient.connect().catch(() => {
      isRedisConnected = false;
    });
  } catch {
    isRedisConnected = false;
  }
}

// Lua script for atomic safe lock release in Redis
const RELEASE_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

/**
 * Acquire an atomic lock on a resource (e.g. auction room)
 * Returns the lock token string if acquired, null if already locked.
 */
export async function acquireLock(resourceKey: string, ttlMs: number = 2000): Promise<string | null> {
  const token = crypto.randomUUID();
  const lockKey = `lock:${resourceKey}`;

  if (isRedisConnected && redisClient) {
    try {
      const result = await redisClient.set(lockKey, token, 'PX', ttlMs, 'NX');
      return result === 'OK' ? token : null;
    } catch {
      // Fallback to memory
      const success = await memoryLock.acquire(lockKey, token, ttlMs);
      return success ? token : null;
    }
  } else {
    const success = await memoryLock.acquire(lockKey, token, ttlMs);
    return success ? token : null;
  }
}

/**
 * Release an atomic lock on a resource
 */
export async function releaseLock(resourceKey: string, token: string): Promise<boolean> {
  const lockKey = `lock:${resourceKey}`;

  if (isRedisConnected && redisClient) {
    try {
      const result = await redisClient.eval(RELEASE_LOCK_LUA, 1, lockKey, token);
      return result === 1;
    } catch {
      return memoryLock.release(lockKey, token);
    }
  } else {
    return memoryLock.release(lockKey, token);
  }
}

/**
 * Executes an operation with concurrency lock protection and retry mechanism
 */
export async function withLock<T>(
  resourceKey: string,
  operation: () => Promise<T>,
  ttlMs: number = 2500,
  maxRetries: number = 5,
  retryDelayMs: number = 80
): Promise<T> {
  let attempts = 0;

  while (attempts < maxRetries) {
    const token = await acquireLock(resourceKey, ttlMs);
    if (token) {
      try {
        return await operation();
      } finally {
        await releaseLock(resourceKey, token);
      }
    }
    attempts++;
    if (attempts < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs + Math.random() * 30));
    }
  }

  throw new Error(`CONCURRENCY_LOCK_TIMEOUT: Auction is under heavy bid collision. Please retry.`);
}

export { redisClient, isRedisConnected };
