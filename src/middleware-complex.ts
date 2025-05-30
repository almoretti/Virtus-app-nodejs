import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkCSRF } from './lib/csrf'
import { checkRateLimit, addRateLimitHeaders } from './lib/rate-limit'
import { getToken } from 'next-auth/jwt'
import { logRateLimitExceeded, logCSRFAttack } from './lib/security-monitor'

export async function middleware(request: NextRequest) {
  try {
    // Apply to API routes only
    if (request.nextUrl.pathname.startsWith('/api/')) {
      // Rate limiting check
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
      const identifier = token?.sub || undefined // Use user ID if authenticated
      
      const rateLimit = await checkRateLimit(request, identifier)
      
      // Create response headers with rate limit info
      const responseHeaders = new Headers()
      addRateLimitHeaders(responseHeaders, rateLimit)
      
      if (!rateLimit.allowed) {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
        logRateLimitExceeded(ip, request.nextUrl.pathname);
        
        return NextResponse.json(
          { error: 'Troppe richieste. Riprova più tardi.' },
          { 
            status: 429,
            headers: responseHeaders
          }
        )
      }
      
      // CSRF check for non-GET requests
      if (!request.nextUrl.pathname.startsWith('/api/auth/') &&
          !request.nextUrl.pathname.startsWith('/api/csrf') &&
          request.method !== 'GET') {
        
        // Skip CSRF check for Bearer token auth
        const authHeader = request.headers.get('authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          const csrfCheck = await checkCSRF(request)
          if (!csrfCheck.valid) {
            const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                       request.headers.get('x-real-ip') || 
                       'unknown';
            const userAgent = request.headers.get('user-agent') || 'unknown';
            logCSRFAttack(ip, request.nextUrl.pathname, userAgent);
            
            return NextResponse.json(
              { error: csrfCheck.error || 'Invalid CSRF token' },
              { 
                status: 403,
                headers: responseHeaders
              }
            )
          }
        }
      }
      
      // Add rate limit headers to successful responses
      const response = NextResponse.next()
      addRateLimitHeaders(response.headers, rateLimit)
      return response
    }

    return NextResponse.next()
  } catch (error) {
    console.error('Middleware error:', error)
    // In case of error, allow the request to proceed
    return NextResponse.next()
  }
}

export const config = {
  matcher: '/api/:path*'
}