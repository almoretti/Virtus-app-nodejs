'use client'

import { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSession } from 'next-auth/react'
import { useConfirm } from '@/hooks/use-confirm'
import { toast } from 'sonner'
import { fetchWithCSRF } from '@/hooks/use-csrf'
import * as api from '@/lib/api-client'

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

// Function to translate time slots to actual times
const translateTimeSlot = (slot: string): string => {
  const translations: Record<string, string> = {
    'MORNING': '10:00 - 12:00',
    'AFTERNOON': '13:00 - 15:00', 
    'EVENING': '16:00 - 18:00'
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
  const { confirm, ConfirmDialog } = useConfirm()
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
      const response = await fetchWithCSRF('/api/bookings')
      if (response.ok) {
        const data = await response.json()
        // Bookings fetched successfully
        
        // Filter out cancelled appointments
        const activeBookings = data.filter((booking: any) => booking.status !== 'CANCELLED')
        
        const formattedBookings = activeBookings.map((booking: any) => {
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
          
          // Formatted booking for calendar display
          
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
        
        // console.log('Formatted bookings for calendar:', formattedBookings)
        setBookings(formattedBookings)
      }
    } catch (error) {
      // console.error('Error fetching bookings:', error)
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
        toast.error('Non è possibile prenotare appuntamenti nel passato')
        return
      }
    }
    
    setSelectedDate(clickedDate)
    setShowBookingDialog(true)
    
    // Fetch availability for selected date
    try {
      const response = await api.get(`/api/availability?date=${format(clickedDate, 'yyyy-MM-dd')}`)
      if (response.ok) {
        const data = await response.json()
        
        // Transform availability data into slots
        const slots: AvailabilitySlot[] = []
        const currentHour = now.getHours()
        
        // Handle new API response format
        if (data.availability) {
          Object.entries(data.availability).forEach(([timeSlot, technicianAvailability]) => {
            // For today, filter out past time slots
            if (clickedDate.toDateString() === now.toDateString()) {
              const slotHour = timeSlot === 'MORNING' ? 10 : timeSlot === 'AFTERNOON' ? 13 : 16
              if (slotHour <= currentHour) {
                return // Skip past time slots for today
              }
            }
            
            // Find technician info for available technicians
            Object.entries(technicianAvailability as Record<string, boolean>).forEach(([technicianId, isAvailable]) => {
              if (isAvailable) {
                // Find technician name from the technicians array
                const techInfo = data.technicians?.find((tech: any) => tech.id === technicianId)
                if (techInfo) {
                  slots.push({
                    date: data.date,
                    slot: timeSlot,
                    technicianId: technicianId,
                    technicianName: techInfo.name,
                    available: true
                  })
                }
              }
            })
          })
        }
        
        setAvailability(slots)
      }
    } catch (error) {
      // console.error('Error fetching availability:', error)
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
      // console.error('No slot or date selected')
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
    
    // console.log('Submitting booking data:', bookingData)
    
    try {
      const response = await fetchWithCSRF('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData),
      })

      // console.log('Response status:', response.status)
      const responseData = await response.json()
      // console.log('Response data:', responseData)

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
        toast.success('Prenotazione creata con successo')
      } else {
        toast.error(responseData.error || 'Creazione prenotazione fallita')
      }
    } catch (error) {
      // console.error('Error creating booking:', error)
      toast.error('Creazione prenotazione fallita')
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
    
    // console.log('Updating booking:', selectedBooking.id, updateData)
    
    try {
      const response = await api.put(`/api/bookings/${selectedBooking.id}`, updateData)

      if (response.ok) {
        setShowEditDialog(false)
        fetchBookings() // Refresh calendar
        setSelectedBooking(null)
        toast.success('Prenotazione aggiornata con successo')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Aggiornamento prenotazione fallito')
      }
    } catch (error) {
      // console.error('Error updating booking:', error)
      toast.error('Aggiornamento prenotazione fallito')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedBooking) return
    
    const confirmed = await confirm({
      title: 'Elimina Appuntamento',
      description: 'Sei sicuro di voler eliminare questo appuntamento? Questa azione non può essere annullata.',
      confirmText: 'Elimina',
      cancelText: 'Annulla',
      destructive: true
    })
    
    if (!confirmed) return
    
    setLoading(true)
    
    try {
      const response = await api.delete(`/api/bookings/${selectedBooking.id}`)

      if (response.ok) {
        setShowEditDialog(false)
        fetchBookings() // Refresh calendar
        setSelectedBooking(null)
        toast.success('Appuntamento eliminato con successo')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Eliminazione prenotazione fallita')
      }
    } catch (error) {
      // console.error('Error deleting booking:', error)
      toast.error('Eliminazione prenotazione fallita')
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

      <Drawer open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-2xl">
            <DrawerHeader>
              <DrawerTitle>
                Crea Prenotazione per {selectedDate && format(selectedDate, 'd MMMM yyyy', { locale: it })}
              </DrawerTitle>
              <DrawerDescription>
                Inserisci i dettagli del cliente e seleziona il tecnico disponibile
              </DrawerDescription>
            </DrawerHeader>
            
            <form id="create-booking-form" onSubmit={handleSubmit} className="px-4 pb-4 space-y-4">
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

            </form>
            
            <DrawerFooter className="px-4">
              <div className="flex gap-2 justify-end w-full">
                <DrawerClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                  >
                    Annulla
                  </Button>
                </DrawerClose>
                <Button
                  type="submit"
                  form="create-booking-form"
                  disabled={!selectedSlot || loading}
                >
                  {loading ? 'Creazione...' : 'Crea Prenotazione'}
                </Button>
              </div>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Edit/Delete Drawer */}
      <Drawer open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-2xl">
            <DrawerHeader>
              <DrawerTitle>
                Modifica Appuntamento
              </DrawerTitle>
              <DrawerDescription>
                Modifica o elimina l'appuntamento esistente
              </DrawerDescription>
            </DrawerHeader>
            
            <form id="edit-booking-form" onSubmit={handleUpdate} className="px-4 pb-4 space-y-4">
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

            </form>
            
            <DrawerFooter className="px-4">
              <div className="flex flex-col sm:flex-row justify-between gap-4 w-full">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                  className="sm:order-1"
                >
                  {loading ? 'Eliminazione...' : 'Elimina Appuntamento'}
                </Button>
                
                <div className="flex gap-2 justify-end sm:order-2">
                  <DrawerClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                    >
                      Annulla
                    </Button>
                  </DrawerClose>
                  <Button
                    type="submit"
                    form="edit-booking-form"
                    disabled={loading}
                  >
                    {loading ? 'Aggiornamento...' : 'Aggiorna Appuntamento'}
                  </Button>
                </div>
              </div>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
      <ConfirmDialog />
    </>
  )
}