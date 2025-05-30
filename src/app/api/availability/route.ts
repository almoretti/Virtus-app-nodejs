import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { TimeSlot } from '@prisma/client'
import { startOfDay, endOfDay, addDays, eachDayOfInterval } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateStr = searchParams.get('date')
    const fromDateStr = searchParams.get('from')
    const toDateStr = searchParams.get('to')
    
    let dayStart: Date, dayEnd: Date
    let isDateRange = false
    
    if (dateStr) {
      // Single date query
      const date = new Date(dateStr)
      dayStart = startOfDay(date)
      dayEnd = endOfDay(date)
    } else if (fromDateStr && toDateStr) {
      // Date range query
      const fromDate = new Date(fromDateStr)
      const toDate = new Date(toDateStr)
      
      if (toDate < fromDate) {
        return NextResponse.json(
          { error: 'La data di fine deve essere successiva alla data di inizio' },
          { status: 400 }
        )
      }
      
      dayStart = startOfDay(fromDate)
      dayEnd = endOfDay(toDate)
      isDateRange = true
    } else {
      return NextResponse.json(
        { error: 'Parametro data richiesto (date oppure from+to)' },
        { status: 400 }
      )
    }
    
    // Get all active technicians
    const technicians = await prisma.technician.findMany({
      where: { active: true },
      include: { user: true }
    })
    
    // Get all bookings for the requested date
    const bookings = await prisma.booking.findMany({
      where: {
        date: {
          gte: dayStart,
          lte: dayEnd
        },
        status: {
          in: ['SCHEDULED', 'COMPLETED']
        }
      }
    })
    
    // Check technician availability (time off)
    const availability = await prisma.technicianAvailability.findMany({
      where: {
        date: {
          gte: dayStart,
          lte: dayEnd
        },
        available: false
      }
    })
    
    // Build availability matrix
    const slots = {
      [TimeSlot.MORNING]: {} as Record<string, boolean>,
      [TimeSlot.AFTERNOON]: {} as Record<string, boolean>,
      [TimeSlot.EVENING]: {} as Record<string, boolean>,
    }
    
    // Initialize all slots as available for active technicians
    technicians.forEach(tech => {
      const isOnTimeOff = availability.some(a => a.technicianId === tech.id)
      
      Object.values(TimeSlot).forEach(slot => {
        slots[slot][tech.id] = !isOnTimeOff
      })
    })
    
    // Mark booked slots as unavailable
    bookings.forEach(booking => {
      if (slots[booking.slot][booking.technicianId] !== undefined) {
        slots[booking.slot][booking.technicianId] = false
      }
    })
    
    if (isDateRange) {
      // For date range queries, return day-by-day breakdown
      const fromDate = new Date(fromDateStr!)
      const toDate = new Date(toDateStr!)
      const dateRange = eachDayOfInterval({ start: fromDate, end: toDate })
      
      const rangeResponse = {
        from: fromDateStr,
        to: toDateStr,
        technicians: technicians.map(tech => ({
          id: tech.id,
          name: tech.user.name || tech.user.email,
          color: tech.color
        })),
        availability: {} as Record<string, Record<string, Record<string, boolean>>>
      }
      
      // For each date in range, calculate availability
      for (const currentDate of dateRange) {
        const currentDayStart = startOfDay(currentDate)
        const currentDayEnd = endOfDay(currentDate)
        const dateKey = currentDate.toISOString().split('T')[0]
        
        // Get bookings for this specific date
        const dayBookings = await prisma.booking.findMany({
          where: {
            date: {
              gte: currentDayStart,
              lte: currentDayEnd
            },
            status: {
              in: ['SCHEDULED', 'COMPLETED']
            }
          }
        })
        
        // Get availability restrictions for this date
        const dayAvailability = await prisma.technicianAvailability.findMany({
          where: {
            date: {
              gte: currentDayStart,
              lte: currentDayEnd
            },
            available: false
          }
        })
        
        rangeResponse.availability[dateKey] = {}
        
        technicians.forEach(tech => {
          const isOnTimeOff = dayAvailability.some(a => a.technicianId === tech.id)
          
          rangeResponse.availability[dateKey][tech.id] = {
            'MORNING': !isOnTimeOff && !dayBookings.some(b => b.technicianId === tech.id && b.slot === TimeSlot.MORNING),
            'AFTERNOON': !isOnTimeOff && !dayBookings.some(b => b.technicianId === tech.id && b.slot === TimeSlot.AFTERNOON),
            'EVENING': !isOnTimeOff && !dayBookings.some(b => b.technicianId === tech.id && b.slot === TimeSlot.EVENING)
          }
        })
      }
      
      return NextResponse.json(rangeResponse)
    } else {
      // Single date response (maintain backward compatibility)
      const formattedSlots = {
        date: dateStr,
        technicians: technicians.map(tech => ({
          id: tech.id,
          name: tech.user.name || tech.user.email,
          color: tech.color
        })),
        availability: {
          'MORNING': {} as Record<string, boolean>,
          'AFTERNOON': {} as Record<string, boolean>,
          'EVENING': {} as Record<string, boolean>
        }
      }
      
      // Build availability for single date
      technicians.forEach(tech => {
        const isOnTimeOff = availability.some(a => a.technicianId === tech.id)
        
        Object.values(TimeSlot).forEach(slot => {
          const isBooked = bookings.some(b => b.technicianId === tech.id && b.slot === slot)
          formattedSlots.availability[slot][tech.id] = !isOnTimeOff && !isBooked
        })
      })
      
      return NextResponse.json(formattedSlots)
    }
    
  } catch (error) {
    // console.error('Error checking availability:', error)
    return NextResponse.json(
      { error: 'Controllo disponibilità fallito' },
      { status: 500 }
    )
  }
}