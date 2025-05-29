import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }
    
    const { id } = params
    
    // Users can update their own profile, admins can update anyone
    if (session.user.id !== id && session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { name, email, role } = body
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }
    
    // Don't allow users to change their own role
    if (id === session.user.id && role !== existingUser.role) {
      return NextResponse.json(
        { error: 'Non puoi modificare il tuo ruolo' },
        { status: 400 }
      )
    }
    
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        role,
      }
    })
    
    // If role changed from TECHNICIAN, delete technician profile
    if (existingUser.role === Role.TECHNICIAN && role !== Role.TECHNICIAN) {
      await prisma.technician.deleteMany({
        where: { userId: id }
      })
    }
    
    return NextResponse.json({
      success: true,
      user: updatedUser
    })
    
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Aggiornamento utente fallito' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }
    
    const { id } = params
    
    // Don't allow users to delete themselves
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Non puoi eliminare il tuo account' },
        { status: 400 }
      )
    }
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        technician: true,
      }
    })
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }
    
    // Check if user has created any bookings
    const bookingsCount = await prisma.booking.count({
      where: { createdById: id }
    })
    
    if (bookingsCount > 0) {
      return NextResponse.json(
        { error: 'Impossibile eliminare: l\'utente ha creato prenotazioni' },
        { status: 400 }
      )
    }
    
    // Delete user (cascades to technician if exists)
    await prisma.user.delete({
      where: { id }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Utente eliminato con successo'
    })
    
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Eliminazione utente fallita' },
      { status: 500 }
    )
  }
}