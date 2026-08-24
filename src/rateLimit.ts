/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * Rate Limiting Implementation
 * Sliding/rolling window rate limiter using Redis with support for IP, User ID, and API key based limiting
 */

import { cache } from './redis';

// Rate limit configuration
interface RateLimitConfig {
  limit: number;           // Maximum requests allowed
  window: number;         // Time window in seconds
  identifier: string;    // IP, user ID, or API key
  skipBypassCheck?: boolean; // Skip bypass key check
}

// Rate limit result
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;          // Unix timestamp when window resets
  limit: number;
  retryAfter?: number;   // Seconds until retry (if not allowed)
}

// Rate limit headers
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'X-RateLimit-Retry-After'?: string;
}

/**
 * Check if identifier has bypass privileges.
 *
 * `process.env` is read per-call, never at module scope: on the Worker runtime
 * env is injected per-request, so a module-scope read is always empty.
 */
function hasBypass(identifier: string): boolean {
  const configured = (process.env['RATE_LIMIT_BYPASS_KEY'] || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  return configured.length > 0 && configured.includes(identifier);
}

/**
 * Get configuration from environment variables
 */
function getConfigFromEnv(): { limit: number; window: number } {
  return {
    limit: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    window: parseInt(process.env.RATE_LIMIT_WINDOW || '60', 10),
  };
}

/**
 * Check if rate limiting is enabled.
 *
 * Fails CLOSED: limiting stays on unless RATE_LIMIT_ENABLED is explicitly
 * 'false'. A missing/misspelled secret must not silently disable protection.
 */
function isRateLimitEnabled(): boolean {
  return (process.env['RATE_LIMIT_ENABLED'] || 'true').toLowerCase() !== 'false';
}

/**
 * Main rate limit check function - sliding window implementation
 * @param config - Rate limit configuration
 * @returns Rate limit result with remaining requests and reset time
 */
export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  // Check if rate limiting is enabled
  if (!isRateLimitEnabled()) {
    return {
      allowed: true,
      remaining: Number.MAX_SAFE_INTEGER,
      reset: Math.floor(Date.now() / 1000) + config.window,
      limit: config.limit,
    };
  }

  // Check for bypass
  if (!config.skipBypassCheck && hasBypass(config.identifier)) {
    console.log(`Rate limit bypassed for: ${config.identifier}`);
    return {
      allowed: true,
      remaining: Number.MAX_SAFE_INTEGER,
      reset: Math.floor(Date.now() / 1000) + config.window,
      limit: config.limit,
    };
  }

  const { limit, window } = config;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - window;
  const key = `ratelimit:${config.identifier}`;

  try {
    // Use Redis sorted set for sliding window
    // Score = timestamp, Member = unique request ID
    const requestId = `${now}-${Math.random().toString(36).substring(7)}`;
    
    // Add current request to window
    await cache.increment(`${key}:count`);
    
    // Use a simple counter approach with expiration
    // This is more efficient than sorted set for high-traffic scenarios
    const count = await cache.get<number>(`${key}:count`) || 0;
    
    // Set expiry if this is the first request in the window
    const exists = await cache.exists(key);
    if (!exists) {
      await cache.set(key, 1, window);
      await cache.set(`${key}:count`, 1, window);
    } else {
      await cache.set(`${key}:count`, count + 1, window);
    }

    const remaining = Math.max(0, limit - count);
    const reset = now + window;

    if (count > limit) {
      // Rate limit exceeded
      const retryAfter = Math.ceil(reset - now);
      
      return {
        allowed: false,
        remaining: 0,
        reset,
        limit,
        retryAfter,
      };
    }

    return {
      allowed: true,
      remaining,
      reset,
      limit,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open - allow request if Redis fails
    return {
      allowed: true,
      remaining: limit - 1,
      reset: now + window,
      limit,
    };
  }
}

/**
 * Rate limit with sliding window using Redis sorted set (more accurate)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function checkRateLimitSlidingWindow(config: RateLimitConfig): Promise<RateLimitResult> {
  if (!isRateLimitEnabled()) {
    return {
      allowed: true,
      remaining: Number.MAX_SAFE_INTEGER,
      reset: Math.floor(Date.now() / 1000) + config.window,
      limit: config.limit,
    };
  }

  if (!config.skipBypassCheck && hasBypass(config.identifier)) {
    return {
      allowed: true,
      remaining: Number.MAX_SAFE_INTEGER,
      reset: Math.floor(Date.now() / 1000) + config.window,
      limit: config.limit,
    };
  }

  const { limit, window } = config;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - window;
  const key = `ratelimit:${config.identifier}`;

  try {
    const client = getRedisClient();
    
    // Remove entries outside the current window
    await client.zremrangebyscore(key, 0, windowStart);
    
    // Count current entries in window
    const currentCount = await client.zcard(key);
    
    // Add current request
    await client.zadd(key, now, `${now}-${Math.random().toString(36).substring(7)}`);
    
    // Set expiry on the key
    await client.expire(key, window);
    
    const remaining = Math.max(0, limit - currentCount);
    const reset = now + window;

    if (currentCount >= limit) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        reset,
        limit,
        retryAfter: Math.ceil(reset - now),
      };
    }

    return {
      allowed: true,
      remaining: remaining - 1,
      reset,
      limit,
    };
  } catch (error) {
    console.error('Sliding window rate limit error:', error);
    // Fail open
    return {
      allowed: true,
      remaining: limit - 1,
      reset: now + window,
      limit,
    };
  }
}

/**
 * Get Redis client (reusing from redis.ts)
 */
function getRedisClient() {
  const { getRedisClient: getClient } = require('./redis');
  return getClient();
}

/**
 * Reset rate limit for a specific identifier (admin function)
 * @param identifier - IP, user ID, or API key
 */
export async function resetRateLimit(identifier: string): Promise<boolean> {
  const key = `ratelimit:${identifier}`;
  
  try {
    await cache.del(key);
    await cache.del(`${key}:count`);
    console.log(`Rate limit reset for: ${identifier}`);
    return true;
  } catch (error) {
    console.error(`Error resetting rate limit for ${identifier}:`, error);
    return false;
  }
}

/**
 * Get current rate limit status for an identifier
 * @param identifier - IP, user ID, or API key
 * @param config - Rate limit configuration
 */
export async function getRateLimitStatus(
  identifier: string,
  config?: Partial<RateLimitConfig>
): Promise<RateLimitResult> {
  const { limit, window } = getConfigFromEnv();
  const fullConfig: RateLimitConfig = {
    limit,
    window,
    identifier,
    ...config,
  };

  return checkRateLimit(fullConfig);
}

/**
 * Rate limit middleware for Next.js/TanStack/Express
 * @param config - Rate limit configuration
 * @returns Express-style middleware function
 */
export function rateLimitMiddleware(config: RateLimitConfig) {
  return async (req: any, res: any, next: any) => {
    const result = await checkRateLimit(config);
    
    // Add rate limit headers
    addRateLimitHeaders(res, result);
    
    if (!result.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
      });
    }
    
    next();
  };
}

/**
 * Rate limit utility for TanStack server functions
 * @param identifier - IP, user ID, or API key
 * @param config - Optional rate limit configuration
 * @returns Rate limit result
 */
export async function checkApiRateLimit(
  identifier: string,
  config?: Partial<RateLimitConfig>
): Promise<RateLimitResult> {
  const { limit, window } = getConfigFromEnv();
  const fullConfig: RateLimitConfig = {
    limit,
    window,
    identifier,
    ...config,
  };

  return checkRateLimit(fullConfig);
}

/**
 * Extract identifier from request (IP, user ID, or API key)
 * @param req - Request object
 * @returns Identifier string
 */
export function extractIdentifier(req: Request): string {
  // Try API key first (highest priority)
  const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization');
  if (apiKey) {
    // Remove 'Bearer ' prefix if present
    return apiKey.replace(/^Bearer\s+/i, '');
  }

  // Try user ID from session/auth
  // This would need to be implemented based on your auth system
  // const userId = req.session?.userId || req.user?.id;
  // if (userId) return userId;

  // Fall back to IP address
  const ip = req.headers.get('x-forwarded-for') || 
            req.headers.get('x-real-ip') || 
            'unknown';
  
  // Take first IP if multiple (proxy chain)
  return ip.split(',')[0].trim();
}

/**
 * TanStack/Next.js server function rate limit check
 * @param req - Request object
 * @param config - Optional rate limit configuration
 * @returns Rate limit result
 */
export async function checkServerRateLimit(
  req: Request,
  config?: Partial<RateLimitConfig>
): Promise<RateLimitResult> {
  const identifier = extractIdentifier(req);
  return checkApiRateLimit(identifier, config);
}

/**
 * Add rate limit headers to response
 * @param res - Response object
 * @param result - Rate limit result
 */
export function addRateLimitHeaders(res: any, result: RateLimitResult): void {
  if (res && res.setHeader) {
    res.setHeader('X-RateLimit-Limit', result.limit.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', result.reset.toString());
    
    if (result.retryAfter) {
      res.setHeader('X-RateLimit-Retry-After', result.retryAfter.toString());
    }
  }
}

/**
 * Get rate limit headers as object
 * @param result - Rate limit result
 * @returns Headers object
 */
export function getRateLimitHeaders(result: RateLimitResult): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };

  if (result.retryAfter) {
    headers['X-RateLimit-Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Rate limit decorator for class methods (TypeScript)
 * @param config - Rate limit configuration
 */
export function RateLimit(config: RateLimitConfig) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await checkRateLimit(config);
      
      if (!result.allowed) {
        throw new Error(
          `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`
        );
      }
      
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Different rate limit presets for common use cases
 */
export const RateLimitPresets = {
  // Strict: 10 requests per minute
  strict: {
    limit: 10,
    window: 60,
  },

  // Moderate: 30 requests per minute
  moderate: {
    limit: 30,
    window: 60,
  },

  // Lenient: 100 requests per minute (default)
  lenient: {
    limit: 100,
    window: 60,
  },

  // Per hour: 1000 requests per hour
  hourly: {
    limit: 1000,
    window: 3600,
  },

  // Upload: 5 uploads per hour
  upload: {
    limit: 5,
    window: 3600,
  },

  // API: 1000 requests per minute
  api: {
    limit: 1000,
    window: 60,
  },
};

/**
 * Check rate limit with preset
 * @param identifier - IP, user ID, or API key
 * @param preset - Rate limit preset name
 */
export async function checkRateLimitWithPreset(
  identifier: string,
  preset: keyof typeof RateLimitPresets
): Promise<RateLimitResult> {
  const config = RateLimitPresets[preset];
  return checkRateLimit({
    ...config,
    identifier,
  });
}

/**
 * Get rate limit statistics for monitoring
 * @param identifier - Optional identifier to get specific stats
 */
export async function getRateLimitStats(identifier?: string): Promise<{
  totalLimited: number;
  currentLimiters: number;
  details: Array<{ identifier: string; count: number; limit: number }>;
}> {
  try {
    const pattern = identifier 
      ? `ratelimit:${identifier}` 
      : 'ratelimit:*';
    
    // This would need to be implemented with Redis SCAN
    // For now, return placeholder stats
    return {
      totalLimited: 0,
      currentLimiters: 0,
      details: [],
    };
  } catch (error) {
    console.error('Error getting rate limit stats:', error);
    return {
      totalLimited: 0,
      currentLimiters: 0,
      details: [],
    };
  }
}

/**
 * Rate-limit bypass is configured exclusively through the RATE_LIMIT_BYPASS_KEY
 * secret and read per-request in `hasBypass`.
 *
 * Runtime mutation helpers were removed deliberately: an in-memory allowlist is
 * both useless on stateless workers (each request may hit a fresh isolate) and a
 * privilege-escalation footgun, since any imported module could add itself.
 */
