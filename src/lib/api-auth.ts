import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createHash } from 'crypto'

interface AuthResult {
  success: boolean
  type?: 'session' | 'token'
  user?: {
    id: string
    email: string
    name?: string
    role: string
  }
  error?: string
  scopes?: string[]
}

/**
 * Validates authentication for API requests
 * Supports both session-based auth (NextAuth) and bearer token auth
 */
export async function validateApiAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('authorization')
    
    // Check for Bearer token first
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7) // Remove "Bearer " prefix
      
      // Hash the incoming token to compare with stored hash
      const hashedToken = createHash('sha256').update(token).digest('hex')
      
      // Validate the API token
      const apiToken = await prisma.apiToken.findFirst({
        where: {
          token: hashedToken,
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true
            }
          }
        }
      })
      
      if (!apiToken) {
        return {
          success: false,
          error: 'Token API non valido'
        }
      }
      
      // Check if token is expired
      if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
        return {
          success: false,
          error: 'Token API scaduto'
        }
      }
      
      // Update last used timestamp
      await prisma.apiToken.update({
        where: { id: apiToken.id },
        data: { lastUsedAt: new Date() }
      }).catch(console.error) // Don't fail the request if this fails
      
      return {
        success: true,
        type: 'token',
        user: {
          id: apiToken.user.id,
          email: apiToken.user.email,
          name: apiToken.user.name || undefined,
          role: apiToken.user.role.toString()
        },
        scopes: apiToken.scopes ? JSON.parse(apiToken.scopes) : []
      }
    }
    
    // Fall back to session-based authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Non autenticato'
      }
    }
    
    return {
      success: true,
      type: 'session',
      user: {
        id: session.user.id,
        email: session.user.email!,
        name: session.user.name || undefined,
        role: session.user.role
      },
      scopes: ['read', 'write', 'admin'] // Session users have all permissions
    }
  } catch (error) {
    // console.error('Error validating API auth:', error)
    return {
      success: false,
      error: 'Errore di autenticazione'
    }
  }
}

/**
 * Check if user has required scope
 */
export function hasScope(userScopes: string[] | undefined, requiredScope: string): boolean {
  if (!userScopes) return false
  return userScopes.includes(requiredScope) || userScopes.includes('admin')
}

/**
 * Check if user has admin role
 */
export function isAdmin(user: { role: string }): boolean {
  return user.role === 'ADMIN'
}

/**
 * Middleware function to require authentication
 */
export async function requireAuth(request: NextRequest) {
  const auth = await validateApiAuth(request)
  
  if (!auth.success) {
    return {
      error: auth.error || 'Autenticazione richiesta',
      status: 401
    }
  }
  
  return { auth }
}

/**
 * Middleware function to require admin role
 */
export async function requireAdmin(request: NextRequest) {
  const authResult = await requireAuth(request)
  
  if ('error' in authResult) {
    return authResult
  }
  
  if (!isAdmin(authResult.auth.user!)) {
    return {
      error: 'Accesso negato - permessi di amministratore richiesti',
      status: 403
    }
  }
  
  return authResult
}