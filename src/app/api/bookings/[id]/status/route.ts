import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }
    
    const { id } = await params
    const body = await request.json()
    const { status } = body
    
    // console.log('Updating booking status:', id, 'to', status)
    
    // Validate status
    const validStatuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Stato non valido' },
        { status: 400 }
      )
    }
    
    // Check if booking exists
    const existingBooking = await prisma.booking.findUnique({
      where: { id }
    })
    
    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Prenotazione non trovata' },
        { status: 404 }
      )
    }
    
    // Update booking status
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date()
      },
      include: {
        customer: true,
        technician: {
          include: { user: true }
        },
        installationType: true,
        createdBy: true,
      }
    })
    
    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      message: `Stato aggiornato a ${status}`
    })
    
  } catch (error) {
    // console.error('Error updating booking status:', error)
    return NextResponse.json(
      { error: 'Aggiornamento stato fallito' },
      { status: 500 }
    )
  }
}