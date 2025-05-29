import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { randomBytes } from 'crypto'
import { getEffectiveUser } from '@/lib/auth-utils'

// GET - List all API tokens for the current user (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorizzato - solo admin' },
        { status: 403 }
      )
    }
    
    const effectiveUser = getEffectiveUser(session)
    if (effectiveUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Non autorizzato - solo admin' },
        { status: 403 }
      )
    }

    const tokens = await prisma.apiToken.findMany({
      where: {
        userId: session.user.id
      },
      select: {
        id: true,
        name: true,
        token: true, // We'll mask this in the response
        expiresAt: true,
        lastUsedAt: true,
        isActive: true,
        scopes: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Mask the tokens for security (show only first 8 chars)
    const maskedTokens = tokens.map(token => ({
      ...token,
      token: `${token.token.substring(0, 8)}...`,
      scopes: token.scopes ? JSON.parse(token.scopes) : []
    }))

    return NextResponse.json(maskedTokens)
  } catch (error) {
    console.error('Error fetching API tokens:', error)
    return NextResponse.json(
      { error: 'Recupero token fallito' },
      { status: 500 }
    )
  }
}

// POST - Create a new API token
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorizzato - solo admin' },
        { status: 403 }
      )
    }
    
    const effectiveUser = getEffectiveUser(session)
    if (effectiveUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Non autorizzato - solo admin' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, expiresAt, scopes } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome token richiesto' },
        { status: 400 }
      )
    }

    // Generate a secure random token
    const token = `vb_${randomBytes(32).toString('hex')}`

    // Validate expiration date if provided
    let expirationDate = null
    if (expiresAt) {
      expirationDate = new Date(expiresAt)
      if (expirationDate <= new Date()) {
        return NextResponse.json(
          { error: 'La data di scadenza deve essere futura' },
          { status: 400 }
        )
      }
    }

    // Validate and serialize scopes
    let scopesJson = null
    if (scopes && Array.isArray(scopes)) {
      const validScopes = ['read', 'write', 'admin']
      const invalidScopes = scopes.filter(scope => !validScopes.includes(scope))
      if (invalidScopes.length > 0) {
        return NextResponse.json(
          { error: `Scopi non validi: ${invalidScopes.join(', ')}` },
          { status: 400 }
        )
      }
      scopesJson = JSON.stringify(scopes)
    }

    const apiToken = await prisma.apiToken.create({
      data: {
        name: name.trim(),
        token,
        userId: session.user.id,
        expiresAt: expirationDate,
        scopes: scopesJson
      }
    })

    return NextResponse.json({
      id: apiToken.id,
      name: apiToken.name,
      token: apiToken.token, // Return full token only on creation
      expiresAt: apiToken.expiresAt,
      scopes: scopesJson ? JSON.parse(scopesJson) : [],
      createdAt: apiToken.createdAt,
      message: 'Token API creato con successo. Salvalo in un posto sicuro - non potrai vederlo di nuovo.'
    })
  } catch (error) {
    console.error('Error creating API token:', error)
    return NextResponse.json(
      { error: 'Creazione token fallita' },
      { status: 500 }
    )
  }
}