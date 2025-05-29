import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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
    const body = await request.json()
    const { customer, installationType, notes, status } = body
    
    console.log('Updating booking:', id, body)
    
    // Check if booking exists
    const existingBooking = await prisma.booking.findUnique({
      where: { id },
      include: { 
        customer: true,
        installationType: true
      }
    })
    
    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Prenotazione non trovata' },
        { status: 404 }
      )
    }
    
    // Update customer information
    if (customer) {
      await prisma.customer.update({
        where: { id: existingBooking.customerId },
        data: {
          name: customer.name || existingBooking.customer.name,
          phone: customer.phone || existingBooking.customer.phone,
          email: customer.email || existingBooking.customer.email,
          address: customer.address || existingBooking.customer.address,
        }
      })
    }
    
    // Find or create installation type if changed
    let installationTypeId = existingBooking.installationTypeId
    if (installationType && installationType !== existingBooking.installationType.name) {
      let installationTypeRecord = await prisma.installationType.findUnique({
        where: { name: installationType }
      })
      
      if (!installationTypeRecord) {
        installationTypeRecord = await prisma.installationType.create({
          data: { name: installationType }
        })
      }
      
      installationTypeId = installationTypeRecord.id
    }
    
    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        installationTypeId,
        notes: notes || existingBooking.notes,
        status: status || existingBooking.status,
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
      booking: updatedBooking
    })
    
  } catch (error) {
    console.error('Error updating booking:', error)
    return NextResponse.json(
      { error: 'Aggiornamento prenotazione fallito' },
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
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }
    
    const { id } = params
    
    console.log('Deleting booking:', id)
    
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
    
    // Soft delete - update status to CANCELLED
    const deletedBooking = await prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Prenotazione annullata con successo'
    })
    
  } catch (error) {
    console.error('Error deleting booking:', error)
    return NextResponse.json(
      { error: 'Eliminazione prenotazione fallita' },
      { status: 500 }
    )
  }
}