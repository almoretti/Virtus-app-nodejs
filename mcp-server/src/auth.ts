import { prisma } from './db.js';

export interface AuthResult {
  success: boolean;
  user?: any;
  scopes?: string[];
  error?: string;
}

export async function validateApiToken(token: string): Promise<AuthResult> {
  try {
    console.log('Validating token:', token ? `${token.substring(0, 15)}...` : 'null');
    
    if (!token || !token.startsWith('vb_')) {
      console.log('Token validation failed: does not start with vb_');
      return { success: false, error: 'Invalid token format' };
    }

    // Find API token
    const apiToken = await prisma.apiToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!apiToken) {
      console.log('Token not found in database');
      return { success: false, error: 'Invalid token' };
    }

    if (!apiToken.isActive) {
      return { success: false, error: 'Token is disabled' };
    }

    if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
      return { success: false, error: 'Token expired' };
    }

    console.log('Token found for user:', apiToken.user.email);
    
    // Update last used timestamp
    await prisma.apiToken.update({
      where: { id: apiToken.id },
      data: { lastUsedAt: new Date() }
    });

    return {
      success: true,
      user: apiToken.user,
      scopes: apiToken.scopes ? apiToken.scopes.split(',') : []
    };
  } catch (error) {
    console.error('Token validation error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

export function extractTokenFromRequest(req: any): string | null {
  // Handle both Express request objects and Headers objects
  let authHeader: string | null = null;
  
  if (req.headers && typeof req.headers === 'object') {
    // Express request object
    authHeader = req.headers.authorization || req.headers.Authorization || null;
  } else if (req.get && typeof req.get === 'function') {
    // Headers object with get method
    authHeader = req.get('authorization');
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}