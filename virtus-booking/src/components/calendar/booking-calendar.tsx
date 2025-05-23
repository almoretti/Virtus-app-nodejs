'use client'

import { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSession } from 'next-auth/react'

interface Booking {
  id: string
  title: string
  start: string
  end: string
  extendedProps: {
    customer: {
      name: string
      phone: string
      address: string
    }
    technician: {
      id: string
      name: string
    }
    installationType: string
    status: string
  }
}

interface AvailabilitySlot {
  date: string
  slot: string
  technicianId: string
  technicianName: string
  available: boolean
}

export function BookingCalendar() {
  const { data: session } = useSession()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [showBookingDialog, setShowBookingDialog] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    installationType: 'standard',
    notes: ''
  })

  // Fetch bookings
  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/bookings')
      if (response.ok) {
        const data = await response.json()
        const formattedBookings = data.map((booking: any) => ({
          id: booking.id,
          title: `${booking.customer.name} - ${booking.technician.user.name}`,
          start: booking.date,
          end: booking.date,
          backgroundColor: booking.technician.color,
          extendedProps: {
            customer: booking.customer,
            technician: {
              id: booking.technician.id,
              name: booking.technician.user.name
            },
            installationType: booking.installationType.name,
            status: booking.status
          }
        }))
        setBookings(formattedBookings)
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
    }
  }

  const handleDateClick = async (arg: any) => {
    setSelectedDate(new Date(arg.date))
    setShowBookingDialog(true)
    
    // Fetch availability for selected date
    try {
      const response = await fetch(`/api/availability?date=${format(arg.date, 'yyyy-MM-dd')}`)
      if (response.ok) {
        const data = await response.json()
        
        // Transform availability data into slots
        const slots: AvailabilitySlot[] = []
        Object.entries(data.slots).forEach(([timeSlot, technicians]) => {
          Object.entries(technicians as Record<string, { available: boolean; id: string; name: string }>).forEach(([_, techInfo]) => {
            if (techInfo.available) {
              slots.push({
                date: data.date,
                slot: timeSlot,
                technicianId: techInfo.id,
                technicianName: techInfo.name,
                available: true
              })
            }
          })
        })
        setAvailability(slots)
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSlot || !selectedDate) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: format(selectedDate, 'yyyy-MM-dd'),
          slot: selectedSlot.slot,
          technicianId: selectedSlot.technicianId,
          customer: {
            name: formData.customerName,
            phone: formData.customerPhone,
            email: formData.customerEmail,
            address: formData.customerAddress,
          },
          installationType: formData.installationType,
          notes: formData.notes,
        }),
      })

      if (response.ok) {
        setShowBookingDialog(false)
        fetchBookings() // Refresh calendar
        // Reset form
        setFormData({
          customerName: '',
          customerPhone: '',
          customerEmail: '',
          customerAddress: '',
          installationType: 'standard',
          notes: ''
        })
        setSelectedSlot(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create booking')
      }
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Failed to create booking')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="p-4">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={bookings}
          dateClick={handleDateClick}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek'
          }}
          height="auto"
        />
      </div>

      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Create Booking for {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Available Slots */}
            <div>
              <Label>Available Time Slots</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {availability.map((slot) => (
                  <Button
                    key={`${slot.slot}-${slot.technicianId}`}
                    type="button"
                    variant={selectedSlot === slot ? "default" : "outline"}
                    onClick={() => setSelectedSlot(slot)}
                    className="flex flex-col items-start p-3"
                  >
                    <span className="font-semibold">{slot.slot}</span>
                    <span className="text-xs">{slot.technicianName}</span>
                  </Button>
                ))}
                {availability.length === 0 && (
                  <p className="col-span-3 text-center text-muted-foreground">
                    No available slots for this date
                  </p>
                )}
              </div>
            </div>

            {/* Customer Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Phone Number</Label>
                <Input
                  id="customerPhone"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerEmail">Email (Optional)</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="installationType">Installation Type</Label>
                <Input
                  id="installationType"
                  value={formData.installationType}
                  onChange={(e) => setFormData({ ...formData, installationType: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="customerAddress">Address</Label>
              <Input
                id="customerAddress"
                value={formData.customerAddress}
                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBookingDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!selectedSlot || loading}
              >
                {loading ? 'Creating...' : 'Create Booking'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}