import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Simplified middleware for Edge Runtime compatibility
 * Complex security logic is handled in API routes
 */

// Simple in-memory rate limiting (Edge Runtime compatible)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function simpleRateLimit(identifier: string, maxRequests: number = 30, windowMs: number = 60000): boolean {
  const now = Date.now();
  const key = identifier;
  const current = requestCounts.get(key);

  if (!current || now > current.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= maxRequests) {
    return false;
  }

  current.count++;
  return true;
}

export async function middleware(request: NextRequest) {
  // Apply to API routes only
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Simple rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'anonymous';
    
    if (!simpleRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Troppe richieste. Riprova più tardi.' },
        { status: 429 }
      );
    }

    // Skip CSRF check for GET requests and Bearer token auth
    if (request.method !== 'GET' && 
        !request.nextUrl.pathname.startsWith('/api/auth/') &&
        !request.headers.get('authorization')?.startsWith('Bearer ')) {
      
      // Simple CSRF check - just verify header exists
      const csrfToken = request.headers.get('x-csrf-token');
      if (!csrfToken) {
        return NextResponse.json(
          { error: 'Missing CSRF token' },
          { status: 403 }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*'
}