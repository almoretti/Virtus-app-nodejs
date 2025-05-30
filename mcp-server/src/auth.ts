import { prisma } from './db.js';

export interface AuthResult {
  success: boolean;
  user?: any;
  scopes?: string[];
  error?: string;
}

export async function validateApiToken(token: string): Promise<AuthResult> {
  try {
    if (!token || !token.startsWith('vb_')) {
      return { success: false, error: 'Invalid token format' };
    }

    // Find API token
    const apiToken = await prisma.apiToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!apiToken) {
      return { success: false, error: 'Invalid token' };
    }

    if (!apiToken.isActive) {
      return { success: false, error: 'Token is disabled' };
    }

    if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
      return { success: false, error: 'Token expired' };
    }

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

export function extractTokenFromRequest(headers: Headers): string | null {
  const authHeader = headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}