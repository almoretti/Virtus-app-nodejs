'use client'

import { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
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

// Function to translate time slots
const translateTimeSlot = (slot: string): string => {
  const translations: Record<string, string> = {
    'MORNING': 'MATTINA',
    'AFTERNOON': 'POMERIGGIO', 
    'EVENING': 'SERA'
  }
  return translations[slot] || slot
}

// Function to translate status
const translateStatus = (status: string): string => {
  const translations: Record<string, string> = {
    'SCHEDULED': 'PROGRAMMATO',
    'COMPLETED': 'COMPLETATO',
    'CANCELLED': 'ANNULLATO'
  }
  return translations[status] || status
}

export function BookingCalendar() {
  const { data: session } = useSession()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [showBookingDialog, setShowBookingDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    installationType: 'standard',
    notes: ''
  })

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch bookings
  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/bookings')
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched bookings:', data)
        
        const formattedBookings = data.map((booking: any) => {
          // Map time slots to actual times
          const timeMap: Record<string, { start: string, end: string }> = {
            'MORNING': { start: '10:00', end: '12:00' },
            'AFTERNOON': { start: '13:00', end: '15:00' },
            'EVENING': { start: '16:00', end: '18:00' }
          }
          
          const times = timeMap[booking.slot] || { start: '10:00', end: '12:00' }
          
          // Format date properly
          const bookingDate = new Date(booking.date)
          const dateStr = bookingDate.toISOString().split('T')[0]
          const startDateTime = `${dateStr}T${times.start}:00`
          const endDateTime = `${dateStr}T${times.end}:00`
          
          console.log('Formatted booking:', {
            date: booking.date,
            slot: booking.slot,
            startDateTime,
            endDateTime
          })
          
          return {
            id: booking.id,
            title: booking.customer.name,
            start: startDateTime,
            end: endDateTime,
            backgroundColor: booking.technician.color || '#3B82F6',
            borderColor: booking.technician.color || '#3B82F6',
            textColor: '#ffffff',
            extendedProps: {
              customer: booking.customer,
              technician: {
                id: booking.technician.id,
                name: booking.technician.user?.name || 'Unknown'
              },
              installationType: booking.installationType?.name || 'Standard',
              status: booking.status,
              slot: booking.slot
            }
          }
        })
        
        console.log('Formatted bookings for calendar:', formattedBookings)
        setBookings(formattedBookings)
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
    }
  }

  const handleDateClick = async (arg: any) => {
    const clickedDate = new Date(arg.date)
    const now = new Date()
    
    // Check if the clicked date is in the past
    if (clickedDate < now) {
      // If it's today, check if we still have time slots available
      if (clickedDate.toDateString() === now.toDateString()) {
        // For today, we'll check available slots later
      } else {
        // Don't allow booking for past dates
        alert('Non è possibile prenotare appuntamenti nel passato')
        return
      }
    }
    
    setSelectedDate(clickedDate)
    setShowBookingDialog(true)
    
    // Fetch availability for selected date
    try {
      const response = await fetch(`/api/availability?date=${format(clickedDate, 'yyyy-MM-dd')}`)
      if (response.ok) {
        const data = await response.json()
        
        // Transform availability data into slots
        const slots: AvailabilitySlot[] = []
        const currentHour = now.getHours()
        
        Object.entries(data.slots).forEach(([timeSlot, technicians]) => {
          // For today, filter out past time slots
          if (clickedDate.toDateString() === now.toDateString()) {
            const slotHour = timeSlot === 'MORNING' ? 10 : timeSlot === 'AFTERNOON' ? 13 : 16
            if (slotHour <= currentHour) {
              return // Skip past time slots for today
            }
          }
          
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

  // Custom event render function for card-like appearance
  const renderEventContent = (eventInfo: any) => {
    const { event } = eventInfo
    const { extendedProps } = event
    
    return (
      <div className="p-2 h-full overflow-hidden">
        <div className="font-semibold text-sm truncate">
          {event.title}
        </div>
        <div className="text-xs opacity-90 truncate">
          {extendedProps.technician.name}
        </div>
        <div className="text-xs opacity-75 truncate">
          {extendedProps.installationType}
        </div>
        <div className="text-xs opacity-75 truncate">
          📍 {extendedProps.customer.address}
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSlot || !selectedDate) {
      console.error('No slot or date selected')
      return
    }
    
    setLoading(true)
    
    const bookingData = {
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
    }
    
    console.log('Submitting booking data:', bookingData)
    
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      })

      console.log('Response status:', response.status)
      const responseData = await response.json()
      console.log('Response data:', responseData)

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
        alert(responseData.error || 'Creazione prenotazione fallita')
      }
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Creazione prenotazione fallita')
    } finally {
      setLoading(false)
    }
  }

  const handleEventClick = (clickInfo: any) => {
    const event = clickInfo.event
    setSelectedBooking({
      id: event.id,
      title: event.title,
      start: event.startStr,
      end: event.endStr,
      extendedProps: event.extendedProps
    })
    
    // Populate form with existing data
    setFormData({
      customerName: event.extendedProps.customer.name,
      customerPhone: event.extendedProps.customer.phone,
      customerEmail: event.extendedProps.customer.email || '',
      customerAddress: event.extendedProps.customer.address,
      installationType: event.extendedProps.installationType,
      notes: event.extendedProps.notes || ''
    })
    
    setShowEditDialog(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBooking) return
    
    setLoading(true)
    
    const updateData = {
      customer: {
        name: formData.customerName,
        phone: formData.customerPhone,
        email: formData.customerEmail,
        address: formData.customerAddress,
      },
      installationType: formData.installationType,
      notes: formData.notes,
    }
    
    console.log('Updating booking:', selectedBooking.id, updateData)
    
    try {
      const response = await fetch(`/api/bookings/${selectedBooking.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        setShowEditDialog(false)
        fetchBookings() // Refresh calendar
        setSelectedBooking(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Aggiornamento prenotazione fallito')
      }
    } catch (error) {
      console.error('Error updating booking:', error)
      alert('Aggiornamento prenotazione fallito')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedBooking) return
    
    if (!confirm('Sei sicuro di voler eliminare questo appuntamento?')) {
      return
    }
    
    setLoading(true)
    
    try {
      const response = await fetch(`/api/bookings/${selectedBooking.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setShowEditDialog(false)
        fetchBookings() // Refresh calendar
        setSelectedBooking(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Eliminazione prenotazione fallita')
      }
    } catch (error) {
      console.error('Error deleting booking:', error)
      alert('Eliminazione prenotazione fallita')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="p-2 sm:p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
          events={bookings}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          headerToolbar={{
            left: isMobile ? 'prev,next' : 'prev,next today',
            center: 'title',
            right: isMobile ? 'timeGridDay' : 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          slotDuration="00:30:00"
          slotLabelInterval="01:00:00"
          height="auto"
          allDaySlot={false}
          weekends={true}
          eventDisplay="block"
          eventContent={renderEventContent}
          slotLabelFormat={{
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short',
            hour12: true
          }}
          eventTimeFormat={{
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short',
            hour12: true
          }}
          dayCellClassNames={(arg) => {
            const cellDate = new Date(arg.date)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            cellDate.setHours(0, 0, 0, 0)
            
            if (cellDate < today) {
              return 'fc-past-date opacity-50 cursor-not-allowed'
            }
            return ''
          }}
        />
      </div>

      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg md:max-w-2xl" aria-describedby="booking-dialog-description">
          <DialogHeader>
            <DialogTitle>
              Crea Prenotazione per {selectedDate && format(selectedDate, 'd MMMM yyyy', { locale: it })}
            </DialogTitle>
            <div id="booking-dialog-description" className="sr-only">
              Finestra per creare un nuovo appuntamento con informazioni del cliente e selezione del tecnico
            </div>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Available Slots */}
            <div>
              <Label>Fasce Orarie Disponibili</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {availability.map((slot) => (
                  <Button
                    key={`${slot.slot}-${slot.technicianId}`}
                    type="button"
                    variant={selectedSlot === slot ? "default" : "outline"}
                    onClick={() => setSelectedSlot(slot)}
                    className="flex flex-col items-start p-2 sm:p-3 text-left"
                  >
                    <span className="font-semibold">{translateTimeSlot(slot.slot)}</span>
                    <span className="text-xs">{slot.technicianName}</span>
                  </Button>
                ))}
                {availability.length === 0 && (
                  <p className="col-span-full text-center text-muted-foreground">
                    Nessuna fascia oraria disponibile per questa data
                  </p>
                )}
              </div>
            </div>

            {/* Customer Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Nome Cliente</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Numero di Telefono</Label>
                <Input
                  id="customerPhone"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerEmail">Email (Facoltativa)</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="installationType">Tipo di Installazione</Label>
                <Input
                  id="installationType"
                  value={formData.installationType}
                  onChange={(e) => setFormData({ ...formData, installationType: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="customerAddress">Indirizzo</Label>
              <Input
                id="customerAddress"
                value={formData.customerAddress}
                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="notes">Note (Facoltative)</Label>
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
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={!selectedSlot || loading}
              >
                {loading ? 'Creazione...' : 'Crea Prenotazione'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit/Delete Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg md:max-w-2xl" aria-describedby="edit-dialog-description">
          <DialogHeader>
            <DialogTitle>
              Modifica Appuntamento
            </DialogTitle>
            <div id="edit-dialog-description" className="sr-only">
              Finestra per modificare o eliminare un appuntamento esistente
            </div>
          </DialogHeader>
          
          <form onSubmit={handleUpdate} className="space-y-4">
            {/* Appointment Details */}
            {selectedBooking && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm">
                  <span className="font-semibold">Data:</span> {format(new Date(selectedBooking.start), 'd MMMM yyyy', { locale: it })}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Ora:</span> {format(new Date(selectedBooking.start), 'HH:mm')} - {format(new Date(selectedBooking.end), 'HH:mm')}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Tecnico:</span> {selectedBooking.extendedProps.technician.name}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Stato:</span> {translateStatus(selectedBooking.extendedProps.status)}
                </p>
              </div>
            )}

            {/* Customer Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-customerName">Nome Cliente</Label>
                <Input
                  id="edit-customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-customerPhone">Numero di Telefono</Label>
                <Input
                  id="edit-customerPhone"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-customerEmail">Email (Facoltativa)</Label>
                <Input
                  id="edit-customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-installationType">Tipo di Installazione</Label>
                <Input
                  id="edit-installationType"
                  value={formData.installationType}
                  onChange={(e) => setFormData({ ...formData, installationType: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-customerAddress">Indirizzo</Label>
              <Input
                id="edit-customerAddress"
                value={formData.customerAddress}
                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-notes">Note (Facoltative)</Label>
              <Input
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? 'Eliminazione...' : 'Elimina Appuntamento'}
              </Button>
              
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Aggiornamento...' : 'Aggiorna Appuntamento'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}