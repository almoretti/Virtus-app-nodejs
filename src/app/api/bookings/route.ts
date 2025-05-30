import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { TimeSlot } from '@prisma/client'
import { startOfDay, endOfDay } from 'date-fns'
import { validateApiAuth, hasScope } from '@/lib/api-auth'
import { checkCSRF } from '@/lib/csrf'
import { CustomerSchema, validateUUID, validateDate, sanitizeHtml } from '@/lib/validation'
import { z } from 'zod'
import { logger } from '@/lib/logger'

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
    const auth = await validateApiAuth(request)
    
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      )
    }

    // Check if user has read permission
    if (!hasScope(auth.scopes, 'read')) {
      return NextResponse.json(
        { error: 'Permessi insufficienti - lettura richiesta' },
        { status: 403 }
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
    logger.error('Error fetching bookings', error);
    return NextResponse.json(
      { error: 'Recupero prenotazioni fallito' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await validateApiAuth(request)
    
    if (!auth.success) {
      logger.error('Unauthorized access attempt', undefined, { error: auth.error })
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      )
    }

    // Check CSRF token for session-based auth
    if (auth.type === 'session') {
      const csrfCheck = await checkCSRF(request)
      if (!csrfCheck.valid) {
        return NextResponse.json(
          { error: csrfCheck.error || 'Invalid CSRF token' },
          { status: 403 }
        )
      }
    }

    // Check if user has write permission
    if (!hasScope(auth.scopes, 'write')) {
      return NextResponse.json(
        { error: 'Permessi insufficienti - scrittura richiesta' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    // console.log('Received booking request:', body)
    let { date, slot, technicianId, customer, installationType, notes } = body
    
    // Validate required fields
    if (!date || !slot || !technicianId || !customer || !installationType) {
      logger.error('Missing required fields', undefined, { date, slot, technicianId, customer, installationType });
      return NextResponse.json(
        { error: 'Campi obbligatori mancanti' },
        { status: 400 }
      )
    }

    // Validate date format
    const validDate = validateDate(date)
    if (!validDate) {
      return NextResponse.json(
        { error: 'Data non valida. Usa il formato YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Validate technician ID
    const validTechnicianId = validateUUID(technicianId)
    if (!validTechnicianId) {
      return NextResponse.json(
        { error: 'ID tecnico non valido' },
        { status: 400 }
      )
    }

    // Validate and sanitize customer data
    try {
      const validatedCustomer = CustomerSchema.parse(customer)
      customer = {
        name: sanitizeHtml(validatedCustomer.name),
        phone: validatedCustomer.phone,
        email: validatedCustomer.email ? sanitizeHtml(validatedCustomer.email) : '',
        address: sanitizeHtml(validatedCustomer.address)
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        return NextResponse.json(
          { error: `Dati cliente non validi: ${errors}` },
          { status: 400 }
        )
      }
    }

    // Sanitize notes if provided
    if (notes) {
      notes = sanitizeHtml(notes)
    }
    
    // Convert slot string to enum
    const timeSlot = slotMapping[slot]
    // console.log('Slot mapping:', slot, '->', timeSlot)
    if (!timeSlot) {
      logger.error('Invalid time slot', undefined, { slot });
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
          logger.error('Attempted to book past time slot', undefined, { timeSlot, currentHour });
          return NextResponse.json(
            { error: 'Non è possibile prenotare appuntamenti nel passato' },
            { status: 400 }
          )
        }
      } else {
        logger.error('Attempted to book past date', undefined, { date });
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
        createdById: auth.user!.id,
        notes: notes || null,
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
    logger.error('Error creating booking', error);
    return NextResponse.json(
      { error: 'Creazione prenotazione fallita' },
      { status: 500 }
    )
  }
}