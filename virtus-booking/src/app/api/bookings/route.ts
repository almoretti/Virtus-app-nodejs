import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { TimeSlot } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { startOfDay, endOfDay } from 'date-fns'

const slotMapping: Record<string, TimeSlot> = {
  '10-12': TimeSlot.MORNING,
  '13-15': TimeSlot.AFTERNOON,
  '16-18': TimeSlot.EVENING,
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const bookings = await prisma.booking.findMany({
      where: {
        status: {
          in: ['SCHEDULED', 'COMPLETED']
        }
      },
      include: {
        customer: true,
        technician: {
          include: { user: true }
        },
        installationType: true,
        createdBy: true,
      },
      orderBy: {
        date: 'desc'
      }
    })
    
    return NextResponse.json(bookings)
    
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { date, slot, technicianId, customer, installationType } = body
    
    // Validate required fields
    if (!date || !slot || !technicianId || !customer || !installationType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Convert slot string to enum
    const timeSlot = slotMapping[slot]
    if (!timeSlot) {
      return NextResponse.json(
        { error: 'Invalid time slot' },
        { status: 400 }
      )
    }
    
    const bookingDate = new Date(date)
    const dayStart = startOfDay(bookingDate)
    const dayEnd = endOfDay(bookingDate)
    
    // Check if technician exists and is active
    const technician = await prisma.technician.findUnique({
      where: { id: technicianId },
    })
    
    if (!technician || !technician.active) {
      return NextResponse.json(
        { error: 'Invalid technician' },
        { status: 400 }
      )
    }
    
    // Check if slot is already booked
    const existingBooking = await prisma.booking.findFirst({
      where: {
        technicianId,
        date: {
          gte: dayStart,
          lte: dayEnd
        },
        slot: timeSlot,
        status: {
          in: ['SCHEDULED', 'COMPLETED']
        }
      }
    })
    
    if (existingBooking) {
      return NextResponse.json(
        { error: 'Slot already booked' },
        { status: 409 }
      )
    }
    
    // Check if technician is available (not on time off)
    const techAvailability = await prisma.technicianAvailability.findFirst({
      where: {
        technicianId,
        date: {
          gte: dayStart,
          lte: dayEnd
        },
        available: false
      }
    })
    
    if (techAvailability) {
      return NextResponse.json(
        { error: 'Technician not available on this date' },
        { status: 409 }
      )
    }
    
    // Find or create installation type
    let installationTypeRecord = await prisma.installationType.findUnique({
      where: { name: installationType }
    })
    
    if (!installationTypeRecord) {
      installationTypeRecord = await prisma.installationType.create({
        data: { name: installationType }
      })
    }
    
    // Create or find customer
    let customerRecord = await prisma.customer.findFirst({
      where: {
        OR: [
          { phone: customer.phone },
          { email: customer.email }
        ]
      }
    })
    
    if (!customerRecord) {
      customerRecord = await prisma.customer.create({
        data: {
          name: customer.name,
          phone: customer.phone,
          email: customer.email || null,
          address: customer.address,
        }
      })
    } else {
      // Update customer info if needed
      customerRecord = await prisma.customer.update({
        where: { id: customerRecord.id },
        data: {
          name: customer.name,
          address: customer.address,
          email: customer.email || customerRecord.email,
        }
      })
    }
    
    // Create booking
    const booking = await prisma.booking.create({
      data: {
        date: bookingDate,
        slot: timeSlot,
        customerId: customerRecord.id,
        technicianId,
        installationTypeId: installationTypeRecord.id,
        createdById: session.user.id,
        notes: body.notes || null,
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
      booking: {
        id: booking.id,
        date: booking.date,
        slot: slot,
        customer: booking.customer,
        technician: {
          id: booking.technician.id,
          name: booking.technician.user.name || booking.technician.user.email
        },
        installationType: booking.installationType.name,
        createdBy: booking.createdBy.name || booking.createdBy.email,
        createdAt: booking.createdAt,
      }
    })
    
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}