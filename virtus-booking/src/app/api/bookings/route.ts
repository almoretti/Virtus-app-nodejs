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
  'MORNING': TimeSlot.MORNING,
  'AFTERNOON': TimeSlot.AFTERNOON,
  'EVENING': TimeSlot.EVENING,
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const dateStr = searchParams.get('date')
    const fromDateStr = searchParams.get('from')
    const toDateStr = searchParams.get('to')
    const statusFilter = searchParams.get('status')
    const technicianIdFilter = searchParams.get('technicianId')
    
    // Build where clause
    const whereClause: any = {
      status: {
        in: ['SCHEDULED', 'COMPLETED', 'CANCELLED']
      }
    }
    
    // Date filtering
    if (dateStr) {
      const date = new Date(dateStr)
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)
      whereClause.date = {
        gte: dayStart,
        lte: dayEnd
      }
    } else if (fromDateStr && toDateStr) {
      const fromDate = new Date(fromDateStr)
      const toDate = new Date(toDateStr)
      
      if (toDate < fromDate) {
        return NextResponse.json(
          { error: 'La data di fine deve essere successiva alla data di inizio' },
          { status: 400 }
        )
      }
      
      whereClause.date = {
        gte: startOfDay(fromDate),
        lte: endOfDay(toDate)
      }
    }
    
    // Status filtering
    if (statusFilter && ['SCHEDULED', 'COMPLETED', 'CANCELLED'].includes(statusFilter)) {
      whereClause.status = statusFilter
    }
    
    // Technician filtering
    if (technicianIdFilter) {
      whereClause.technicianId = technicianIdFilter
    }
    
    const bookings = await prisma.booking.findMany({
      where: whereClause,
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
      { error: 'Recupero prenotazioni fallito' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      console.error('Unauthorized: No session found')
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    console.log('Received booking request:', body)
    const { date, slot, technicianId, customer, installationType } = body
    
    // Validate required fields
    if (!date || !slot || !technicianId || !customer || !installationType) {
      console.error('Missing required fields:', { date, slot, technicianId, customer, installationType })
      return NextResponse.json(
        { error: 'Campi obbligatori mancanti' },
        { status: 400 }
      )
    }
    
    // Convert slot string to enum
    const timeSlot = slotMapping[slot]
    console.log('Slot mapping:', slot, '->', timeSlot)
    if (!timeSlot) {
      console.error('Invalid time slot:', slot)
      return NextResponse.json(
        { error: 'Fascia oraria non valida' },
        { status: 400 }
      )
    }
    
    const bookingDate = new Date(date)
    const now = new Date()
    const dayStart = startOfDay(bookingDate)
    const dayEnd = endOfDay(bookingDate)
    
    // Check if booking date is in the past
    if (bookingDate < now) {
      // If it's today, check the time slot
      if (dayStart.toDateString() === now.toDateString()) {
        const currentHour = now.getHours()
        const slotHour = timeSlot === TimeSlot.MORNING ? 10 : 
                        timeSlot === TimeSlot.AFTERNOON ? 13 : 16
        
        if (slotHour <= currentHour) {
          console.error('Attempted to book past time slot:', timeSlot, 'at', currentHour)
          return NextResponse.json(
            { error: 'Non è possibile prenotare appuntamenti nel passato' },
            { status: 400 }
          )
        }
      } else {
        console.error('Attempted to book past date:', date)
        return NextResponse.json(
          { error: 'Cannot book appointments in the past' },
          { status: 400 }
        )
      }
    }
    
    // Check if technician exists and is active
    const technician = await prisma.technician.findUnique({
      where: { id: technicianId },
    })
    
    if (!technician || !technician.active) {
      return NextResponse.json(
        { error: 'Tecnico non valido' },
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
        { error: 'Fascia oraria già prenotata' },
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
        { error: 'Tecnico non disponibile in questa data' },
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
      { error: 'Creazione prenotazione fallita' },
      { status: 500 }
    )
  }
}