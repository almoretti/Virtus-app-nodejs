import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getEffectiveUser } from '@/lib/auth-utils'

// DELETE - Remove an API token
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const tokenId = params.id

    // Verify the token belongs to the current user
    const existingToken = await prisma.apiToken.findFirst({
      where: {
        id: tokenId,
        userId: session.user.id
      }
    })

    if (!existingToken) {
      return NextResponse.json(
        { error: 'Token non trovato' },
        { status: 404 }
      )
    }

    await prisma.apiToken.delete({
      where: {
        id: tokenId
      }
    })

    return NextResponse.json({
      message: 'Token eliminato con successo'
    })
  } catch (error) {
    console.error('Error deleting API token:', error)
    return NextResponse.json(
      { error: 'Eliminazione token fallita' },
      { status: 500 }
    )
  }
}

// PATCH - Update token (deactivate/reactivate)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { isActive } = body
    const tokenId = params.id

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Campo isActive richiesto (boolean)' },
        { status: 400 }
      )
    }

    // Verify the token belongs to the current user
    const existingToken = await prisma.apiToken.findFirst({
      where: {
        id: tokenId,
        userId: session.user.id
      }
    })

    if (!existingToken) {
      return NextResponse.json(
        { error: 'Token non trovato' },
        { status: 404 }
      )
    }

    const updatedToken = await prisma.apiToken.update({
      where: {
        id: tokenId
      },
      data: {
        isActive
      }
    })

    return NextResponse.json({
      id: updatedToken.id,
      name: updatedToken.name,
      isActive: updatedToken.isActive,
      message: `Token ${isActive ? 'attivato' : 'disattivato'} con successo`
    })
  } catch (error) {
    console.error('Error updating API token:', error)
    return NextResponse.json(
      { error: 'Aggiornamento token fallito' },
      { status: 500 }
    )
  }
}