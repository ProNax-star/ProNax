/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * Redis Client Configuration
 * Provides caching layer with auto-reconnect, error handling, and pattern invalidation
 */

import * as RedisNS from 'redis';

type RedisClient = any;
const Redis: any = (RedisNS as any).createClient ?? (RedisNS as any).default ?? RedisNS;

// Redis client instance
let redisClient: RedisClient | null = null;

/**
 * Get or create Redis client instance with connection pooling and auto-reconnect
 */
export function getRedisClient(): RedisClient {
  if (!redisClient) {
    redisClient = (typeof Redis === 'function' ? Redis : Redis.createClient)({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis reconnection failed after 10 retries');
            return new Error('Redis reconnection failed');
          }
          const delay = Math.min(retries * 100, 3000);
          console.log(`Redis reconnecting... attempt ${retries}, delay ${delay}ms`);
          return delay;
        },
        connectTimeout: 10000,
        lazyConnect: false,
      },
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('Redis retry failed after 3 attempts');
          return null;
        }
        return Math.min(times * 50, 2000);
      },
    });

    redisClient.on('connect', () => {
      console.log('Redis client connected');
    });

    redisClient.on('error', (err) => {
      console.error('Redis client error:', err);
    });

    redisClient.on('reconnecting', () => {
      console.log('Redis client reconnecting');
    });

    redisClient.on('close', () => {
      console.log('Redis client connection closed');
    });
  }

  return redisClient;
}

/**
 * Cache operations with error handling and fallback
 */
export const cache = {
  /**
   * Get value from cache with type safety
   * @param key - Cache key
   * @returns Cached value or null if not found/error
   */
  async get<T>(key: string): Promise<T | null> {
    if (!isCacheEnabled()) {
      return null;
    }

    try {
      const client = getRedisClient();
      const data = await client.get(key);
      
      if (!data) {
        return null;
      }

      try {
        return JSON.parse(data) as T;
      } catch (parseError) {
        console.error(`Failed to parse cache data for key ${key}:`, parseError);
        return data as T;
      }
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Set value in cache with optional TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds (optional)
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!isCacheEnabled()) {
      return false;
    }

    try {
      const client = getRedisClient();
      const data = JSON.stringify(value);
      
      if (ttl && ttl > 0) {
        await client.setex(key, ttl, data);
      } else {
        await client.set(key, data);
      }
      
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Delete single key from cache
   * @param key - Cache key to delete
   */
  async del(key: string): Promise<boolean> {
    if (!isCacheEnabled()) {
      return false;
    }

    try {
      const client = getRedisClient();
      await client.del(key);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Invalidate multiple keys matching a pattern
   * @param pattern - Redis key pattern (e.g., "video:*")
   */
  async invalidatePattern(pattern: string): Promise<number> {
    if (!isCacheEnabled()) {
      return 0;
    }

    try {
      const client = getRedisClient();
      const keys = await client.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      await client.del(...keys);
      console.log(`Invalidated ${keys.length} keys matching pattern: ${pattern}`);
      return keys.length;
    } catch (error) {
      console.error(`Cache pattern invalidation error for pattern ${pattern}:`, error);
      return 0;
    }
  },

  /**
   * Check if key exists in cache
   * @param key - Cache key
   */
  async exists(key: string): Promise<boolean> {
    if (!isCacheEnabled()) {
      return false;
    }

    try {
      const client = getRedisClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Set multiple values at once (pipeline)
   * @param items - Array of {key, value, ttl?}
   */
  async mset(items: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean> {
    if (!isCacheEnabled()) {
      return false;
    }

    try {
      const client = getRedisClient();
      const pipeline = client.multi();

      for (const item of items) {
        const data = JSON.stringify(item.value);
        if (item.ttl && item.ttl > 0) {
          pipeline.setex(item.key, item.ttl, data);
        } else {
          pipeline.set(item.key, data);
        }
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  },

  /**
   * Get multiple values at once (pipeline)
   * @param keys - Array of cache keys
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!isCacheEnabled()) {
      return keys.map(() => null);
    }

    try {
      const client = getRedisClient();
      const values = await client.mget(...keys);
      
      return values.map((value) => {
        if (!value) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as T;
        }
      });
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  },

  /**
   * Increment a counter in cache
   * @param key - Cache key
   * @param increment - Amount to increment (default: 1)
   */
  async increment(key: string, increment: number = 1): Promise<number> {
    if (!isCacheEnabled()) {
      return 0;
    }

    try {
      const client = getRedisClient();
      return await client.incrby(key, increment);
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  },

  /**
   * Set expiry time for existing key
   * @param key - Cache key
   * @param ttl - Time to live in seconds
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    if (!isCacheEnabled()) {
      return false;
    }

    try {
      const client = getRedisClient();
      const result = await client.expire(key, ttl);
      return result === 1;
    } catch (error) {
      console.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  },
};

/**
 * Check if caching is enabled via environment variable
 */
function isCacheEnabled(): boolean {
  return process.env.CACHE_ENABLED === 'true';
}

/**
 * Get default TTL from environment variable
 */
export function getDefaultTTL(): number {
  return parseInt(process.env.CACHE_TTL || '3600', 10);
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      console.log('Redis connection closed');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    await closeRedisConnection();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await closeRedisConnection();
    process.exit(0);
  });
}

export default getRedisClient();
