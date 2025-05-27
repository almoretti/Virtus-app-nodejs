import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { TimeSlot } from '@prisma/client'
import { startOfDay, endOfDay } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateStr = searchParams.get('date')
    
    if (!dateStr) {
      return NextResponse.json(
        { error: 'Parametro data richiesto' },
        { status: 400 }
      )
    }
    
    const date = new Date(dateStr)
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)
    
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
    
    // Format response with technician details
    const formattedSlots = {
      date: dateStr,
      slots: {
        '10-12': {} as Record<string, { available: boolean; id: string; name: string }>,
        '13-15': {} as Record<string, { available: boolean; id: string; name: string }>,
        '16-18': {} as Record<string, { available: boolean; id: string; name: string }>,
      }
    }
    
    // Map enum values to time ranges
    const slotMapping = {
      [TimeSlot.MORNING]: '10-12',
      [TimeSlot.AFTERNOON]: '13-15',
      [TimeSlot.EVENING]: '16-18',
    }
    
    Object.entries(slots).forEach(([slotEnum, techAvailability]) => {
      const timeRange = slotMapping[slotEnum as TimeSlot]
      technicians.forEach(tech => {
        const techName = tech.user.name || tech.user.email
        formattedSlots.slots[timeRange][techName] = {
          available: techAvailability[tech.id],
          id: tech.id,
          name: techName
        }
      })
    })
    
    return NextResponse.json(formattedSlots)
    
  } catch (error) {
    console.error('Error checking availability:', error)
    return NextResponse.json(
      { error: 'Controllo disponibilità fallito' },
      { status: 500 }
    )
  }
}