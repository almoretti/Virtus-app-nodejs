"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Calendar, Clock, User, MapPin, Phone, Mail, FileText, Edit2, Trash2, Filter, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useConfirm } from '@/hooks/use-confirm'
import { toast } from 'sonner'

interface Booking {
  id: string
  date: string
  slot: string
  status: string
  customer: {
    name: string
    phone: string
    email?: string
    address: string
  }
  technician: {
    id: string
    name: string
    color: string
  }
  installationType: {
    name: string
  }
  notes?: string
  createdAt: string
}

const translateTimeSlot = (slot: string): string => {
  const translations: Record<string, string> = {
    'MORNING': '10:00 - 12:00',
    'AFTERNOON': '13:00 - 15:00', 
    'EVENING': '16:00 - 18:00'
  }
  return translations[slot] || slot
}

const translateStatus = (status: string): string => {
  const translations: Record<string, string> = {
    'SCHEDULED': 'PROGRAMMATO',
    'COMPLETED': 'COMPLETATO',
    'CANCELLED': 'ANNULLATO'
  }
  return translations[status] || status
}

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'SCHEDULED': 'bg-blue-100 text-blue-800',
    'COMPLETED': 'bg-green-100 text-green-800',
    'CANCELLED': 'bg-red-100 text-red-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

const getStatusSelectColor = (status: string): string => {
  const colors: Record<string, string> = {
    'SCHEDULED': 'text-blue-700 bg-blue-50 border-blue-200',
    'COMPLETED': 'text-green-700 bg-green-50 border-green-200',
    'CANCELLED': 'text-red-700 bg-red-50 border-red-200'
  }
  return colors[status] || 'text-gray-700 bg-gray-50 border-gray-200'
}

export function AppointmentsList() {
  const { data: session } = useSession()
  const { confirm, ConfirmDialog } = useConfirm()
  const [appointments, setAppointments] = useState<Booking[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState<Booking | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [technicianFilter, setTechnicianFilter] = useState('ALL')
  const [technicians, setTechnicians] = useState<{id: string, name: string}[]>([])
  const [excludeCancelled, setExcludeCancelled] = useState(true)

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    installationType: '',
    notes: ''
  })

  useEffect(() => {
    fetchAppointments()
    fetchTechnicians()
  }, [])

  useEffect(() => {
    filterAppointments()
  }, [appointments, searchTerm, statusFilter, technicianFilter, excludeCancelled])

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/bookings')
      if (response.ok) {
        const data = await response.json()
        // Map the data to match our interface
        const mappedData = data.map((booking: any) => ({
          ...booking,
          technician: {
            id: booking.technician.id,
            name: booking.technician.user?.name || booking.technician.user?.email || 'N/A',
            color: booking.technician.color
          }
        }))
        const sortedData = mappedData.sort((a: Booking, b: Booking) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        setAppointments(sortedData)
      }
    } catch (error) {
      // console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTechnicians = async () => {
    try {
      const response = await fetch('/api/technicians')
      if (response.ok) {
        const data = await response.json()
        setTechnicians(data.map((tech: any) => ({
          id: tech.id,
          name: tech.user.name || tech.user.email
        })))
      }
    } catch (error) {
      // console.error('Error fetching technicians:', error)
    }
  }

  const filterAppointments = () => {
    let filtered = [...appointments]

    // Exclude cancelled filter
    if (excludeCancelled) {
      filtered = filtered.filter(apt => apt.status !== 'CANCELLED')
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(apt => 
        apt.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.customer.phone.includes(searchTerm) ||
        apt.customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.customer.address.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(apt => apt.status === statusFilter)
    }

    // Technician filter
    if (technicianFilter !== 'ALL') {
      filtered = filtered.filter(apt => apt.technician.id === technicianFilter)
    }

    setFilteredAppointments(filtered)
  }

  const handleViewDetails = (appointment: Booking) => {
    setSelectedAppointment(appointment)
    setShowDetailsDialog(true)
  }

  const handleEdit = (appointment: Booking) => {
    setSelectedAppointment(appointment)
    setFormData({
      customerName: appointment.customer.name,
      customerPhone: appointment.customer.phone,
      customerEmail: appointment.customer.email || '',
      customerAddress: appointment.customer.address,
      installationType: appointment.installationType.name,
      notes: appointment.notes || ''
    })
    setShowEditDialog(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAppointment) return

    setLoading(true)
    try {
      const response = await fetch(`/api/bookings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAppointment.id,
          ...formData
        })
      })

      if (response.ok) {
        await fetchAppointments()
        setShowEditDialog(false)
        setSelectedAppointment(null)
        toast.success('Appuntamento aggiornato con successo')
      } else {
        toast.error('Errore durante l\'aggiornamento dell\'appuntamento')
      }
    } catch (error) {
      // console.error('Error updating appointment:', error)
      toast.error('Errore durante l\'aggiornamento dell\'appuntamento')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedAppointment) return
    
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
      const response = await fetch(`/api/bookings`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedAppointment.id })
      })

      if (response.ok) {
        await fetchAppointments()
        setShowEditDialog(false)
        setSelectedAppointment(null)
        toast.success('Appuntamento eliminato con successo')
      } else {
        toast.error('Errore durante l\'eliminazione dell\'appuntamento')
      }
    } catch (error) {
      // console.error('Error deleting appointment:', error)
      toast.error('Errore durante l\'eliminazione dell\'appuntamento')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (appointmentId: string, newStatus: string, currentStatus: string) => {
    // Don't do anything if status hasn't changed
    if (newStatus === currentStatus) return
    
    const confirmed = await confirm({
      description: `Sei sicuro di voler cambiare lo stato a ${translateStatus(newStatus)}?`,
      confirmText: 'Cambia Stato',
      cancelText: 'Annulla'
    })
    
    if (!confirmed) {
      // Reset the select to current value if cancelled
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/bookings/${appointmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        await fetchAppointments()
        toast.success(`Stato aggiornato a ${translateStatus(newStatus)}`)
      } else {
        const data = await response.json()
        toast.error(data.error || 'Errore durante l\'aggiornamento dello stato')
      }
    } catch (error) {
      // console.error('Error updating status:', error)
      toast.error('Errore durante l\'aggiornamento dello stato')
    } finally {
      setLoading(false)
    }
  }

  if (loading && appointments.length === 0) {
    return <div className="flex justify-center items-center h-64">Caricamento appuntamenti...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Lista Appuntamenti</h1>
        <p className="mt-1 text-sm text-gray-600">
          Visualizza e gestisci tutti gli appuntamenti
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Filtri</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="search">Cerca</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Nome, telefono, email, indirizzo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="status-filter">Stato</Label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-sm"
            >
              <option value="ALL">Tutti gli stati</option>
              <option value="SCHEDULED">Programmato</option>
              <option value="COMPLETED">Completato</option>
              <option value="CANCELLED">Annullato</option>
            </select>
          </div>

          <div>
            <Label htmlFor="technician-filter">Tecnico</Label>
            <select
              id="technician-filter"
              value={technicianFilter}
              onChange={(e) => setTechnicianFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-sm"
            >
              <option value="ALL">Tutti i tecnici</option>
              {technicians.map(tech => (
                <option key={tech.id} value={tech.id}>{tech.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('ALL')
                setTechnicianFilter('ALL')
                setExcludeCancelled(true)
              }}
              className="w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              Pulisci Filtri
            </Button>
          </div>
        </div>
        
        <div className="mt-4 flex items-center">
          <input
            type="checkbox"
            id="exclude-cancelled"
            checked={excludeCancelled}
            onChange={(e) => setExcludeCancelled(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <Label htmlFor="exclude-cancelled" className="ml-2 cursor-pointer">
            Escludi appuntamenti annullati
          </Label>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        Mostrando {filteredAppointments.length} di {appointments.length} appuntamenti
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun appuntamento trovato</h3>
            <p className="mt-1 text-sm text-gray-500">
              Nessun appuntamento corrisponde ai filtri selezionati.
            </p>
          </div>
        ) : (
          filteredAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="bg-white p-4 sm:p-6 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="relative">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div className="flex-1">
                  <div className="mb-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      {appointment.customer.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: appointment.technician.color }}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Tecnico: {appointment.technician.name}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(appointment.date), 'd MMMM yyyy', { locale: it })}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{translateTimeSlot(appointment.slot)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{appointment.customer.address}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{appointment.customer.phone}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{appointment.customer.email || 'Non fornita'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Tipo: {appointment.installationType.name}</span>
                    </div>
                  </div>

                  {appointment.notes && (
                    <div className="mt-3 flex items-start gap-2 text-sm text-gray-600">
                      <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{appointment.notes}</span>
                    </div>
                  )}
                  
                </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(appointment)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Status selector at bottom right */}
                <div className="mt-4 flex justify-end">
                  <select
                    value={appointment.status}
                    onChange={(e) => handleStatusChange(appointment.id, e.target.value, appointment.status)}
                    className={`px-3 py-1 rounded-md text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-offset-1 ${getStatusSelectColor(appointment.status)}`}
                    disabled={loading}
                  >
                    <option value="SCHEDULED">Programmato</option>
                    <option value="COMPLETED">Completato</option>
                    <option value="CANCELLED">Annullato</option>
                  </select>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Dettagli Appuntamento</DialogTitle>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="font-medium">Data</Label>
                  <p>{format(new Date(selectedAppointment.date), 'd MMMM yyyy', { locale: it })}</p>
                </div>
                
                <div>
                  <Label className="font-medium">Orario</Label>
                  <p>{translateTimeSlot(selectedAppointment.slot)}</p>
                </div>
                
                <div>
                  <Label className="font-medium">Stato</Label>
                  <p>{translateStatus(selectedAppointment.status)}</p>
                </div>
                
                <div>
                  <Label className="font-medium">Tecnico</Label>
                  <p>{selectedAppointment.technician.name}</p>
                </div>
                
                <div>
                  <Label className="font-medium">Cliente</Label>
                  <p>{selectedAppointment.customer.name}</p>
                </div>
                
                <div>
                  <Label className="font-medium">Telefono</Label>
                  <p>{selectedAppointment.customer.phone}</p>
                </div>
                
                {selectedAppointment.customer.email && (
                  <div className="sm:col-span-2">
                    <Label className="font-medium">Email</Label>
                    <p>{selectedAppointment.customer.email}</p>
                  </div>
                )}
                
                <div className="sm:col-span-2">
                  <Label className="font-medium">Indirizzo</Label>
                  <p>{selectedAppointment.customer.address}</p>
                </div>
                
                <div className="sm:col-span-2">
                  <Label className="font-medium">Tipo Installazione</Label>
                  <p>{selectedAppointment.installationType.name}</p>
                </div>
                
                {selectedAppointment.notes && (
                  <div className="sm:col-span-2">
                    <Label className="font-medium">Note</Label>
                    <p>{selectedAppointment.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Drawer */}
      <Drawer open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-2xl">
            <DrawerHeader>
              <DrawerTitle>Modifica Appuntamento</DrawerTitle>
              <DrawerDescription>Modifica i dettagli dell'appuntamento</DrawerDescription>
            </DrawerHeader>
            
            <form id="edit-appointment-form" onSubmit={handleUpdate} className="px-4 pb-4 space-y-4">
            {selectedAppointment && (
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <p><span className="font-semibold">Data:</span> {format(new Date(selectedAppointment.date), 'd MMMM yyyy', { locale: it })}</p>
                <p><span className="font-semibold">Orario:</span> {translateTimeSlot(selectedAppointment.slot)}</p>
                <p><span className="font-semibold">Tecnico:</span> {selectedAppointment.technician.name}</p>
              </div>
            )}

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
                <Label htmlFor="edit-customerPhone">Telefono</Label>
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
                <Label htmlFor="edit-installationType">Tipo Installazione</Label>
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
                  <Trash2 className="h-4 w-4 mr-2" />
                  {loading ? 'Eliminazione...' : 'Elimina'}
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
                    form="edit-appointment-form"
                    disabled={loading}
                  >
                    {loading ? 'Aggiornamento...' : 'Aggiorna'}
                  </Button>
                </div>
              </div>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
      <ConfirmDialog />
    </div>
  )
}