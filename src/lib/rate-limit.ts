import { NextRequest } from 'next/server';
import { LRUCache } from 'lru-cache';

export interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in the time window
}

// Different rate limit configurations for different endpoints
export const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // Authentication endpoints - more restrictive
  '/api/auth': { interval: 60 * 1000, maxRequests: 5 }, // 5 requests per minute
  '/api/tokens': { interval: 60 * 1000, maxRequests: 10 }, // 10 requests per minute
  '/api/invitations': { interval: 60 * 1000, maxRequests: 5 }, // 5 requests per minute
  
  // Read endpoints - more permissive
  '/api/bookings:GET': { interval: 60 * 1000, maxRequests: 60 }, // 60 requests per minute
  '/api/availability': { interval: 60 * 1000, maxRequests: 30 }, // 30 requests per minute
  '/api/technicians:GET': { interval: 60 * 1000, maxRequests: 30 }, // 30 requests per minute
  '/api/users:GET': { interval: 60 * 1000, maxRequests: 30 }, // 30 requests per minute
  
  // Write endpoints - moderate limits
  '/api/bookings:POST': { interval: 60 * 1000, maxRequests: 20 }, // 20 bookings per minute
  '/api/bookings:PUT': { interval: 60 * 1000, maxRequests: 20 }, // 20 updates per minute
  '/api/bookings:DELETE': { interval: 60 * 1000, maxRequests: 20 }, // 20 cancellations per minute
  
  // MCP endpoints
  '/api/mcp': { interval: 60 * 1000, maxRequests: 100 }, // 100 requests per minute
  
  // Default for other endpoints
  default: { interval: 60 * 1000, maxRequests: 30 } // 30 requests per minute
};

// Create separate caches for different rate limit windows
const rateLimiters = new Map<string, LRUCache<string, number[]>>();

function getRateLimiter(key: string): LRUCache<string, number[]> {
  if (!rateLimiters.has(key)) {
    rateLimiters.set(key, new LRUCache<string, number[]>({
      max: 10000, // Maximum number of items in cache
      ttl: 60 * 60 * 1000, // 1 hour TTL
    }));
  }
  return rateLimiters.get(key)!;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: Date;
}

export async function checkRateLimit(
  request: NextRequest,
  identifier?: string
): Promise<RateLimitResult> {
  // Determine the identifier (IP address or user ID)
  const id = identifier || 
    request.headers.get('x-forwarded-for')?.split(',')[0] || 
    request.headers.get('x-real-ip') || 
    'anonymous';

  // Determine which rate limit config to use
  const path = request.nextUrl.pathname;
  const method = request.method;
  const configKey = `${path}:${method}`;
  
  let config = rateLimitConfigs[configKey] || 
    rateLimitConfigs[path] || 
    rateLimitConfigs.default;
  
  // Special handling for auth endpoints
  if (path.startsWith('/api/auth')) {
    config = rateLimitConfigs['/api/auth'];
  } else if (path.startsWith('/api/tokens')) {
    config = rateLimitConfigs['/api/tokens'];
  } else if (path.startsWith('/api/invitations')) {
    config = rateLimitConfigs['/api/invitations'];
  }

  const now = Date.now();
  const windowStart = now - config.interval;
  
  // Get the rate limiter for this config
  const limiter = getRateLimiter(`${config.interval}:${config.maxRequests}`);
  
  // Get the user's request timestamps
  let timestamps = limiter.get(id) || [];
  
  // Remove old timestamps outside the current window
  timestamps = timestamps.filter(timestamp => timestamp > windowStart);
  
  // Check if limit is exceeded
  if (timestamps.length >= config.maxRequests) {
    const oldestTimestamp = Math.min(...timestamps);
    const reset = new Date(oldestTimestamp + config.interval);
    
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      reset
    };
  }
  
  // Add current timestamp
  timestamps.push(now);
  limiter.set(id, timestamps);
  
  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - timestamps.length,
    reset: new Date(now + config.interval)
  };
}

// Helper to add rate limit headers to response
export function addRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult
): void {
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.reset.toISOString());
}