import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No bearer token provided' })
  }
  
  const token = authHeader.substring(7)
  
  try {
    // Check if token exists at all
    const tokenExists = await prisma.apiToken.findUnique({
      where: { token }
    })
    
    if (!tokenExists) {
      return NextResponse.json({ 
        error: 'Token not found in database',
        tokenProvided: token.substring(0, 10) + '...'
      })
    }
    
    // Check if active
    const activeToken = await prisma.apiToken.findFirst({
      where: { 
        token,
        isActive: true
      },
      include: {
        user: true
      }
    })
    
    if (!activeToken) {
      return NextResponse.json({ 
        error: 'Token exists but is not active',
        token: {
          name: tokenExists.name,
          isActive: tokenExists.isActive,
          expiresAt: tokenExists.expiresAt,
          createdAt: tokenExists.createdAt
        }
      })
    }
    
    // Check expiration
    if (activeToken.expiresAt && activeToken.expiresAt < new Date()) {
      return NextResponse.json({ 
        error: 'Token is expired',
        expiresAt: activeToken.expiresAt
      })
    }
    
    return NextResponse.json({
      success: true,
      token: {
        name: activeToken.name,
        user: activeToken.user.email,
        scopes: activeToken.scopes ? JSON.parse(activeToken.scopes) : [],
        isActive: activeToken.isActive,
        expiresAt: activeToken.expiresAt
      }
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Database error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}