"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Role } from "@prisma/client"
import { useSession } from "next-auth/react"
import { Plus, Edit2, Save, X } from "lucide-react"
import * as api from '@/lib/api-client'

interface Technician {
  id: string
  userId: string
  color: string
  active: boolean
  user: {
    id: string
    email: string
    name: string | null
  }
}

interface User {
  id: string
  email: string
  name: string | null
  role: Role
}

export function TechnicianManagement() {
  const { data: session } = useSession()
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [newColor, setNewColor] = useState("#3B82F6")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [techResponse, usersResponse] = await Promise.all([
        api.get("/api/technicians"),
        api.get("/api/users"),
      ])

      if (techResponse.ok && usersResponse.ok) {
        const techData = await techResponse.json()
        const usersData = await usersResponse.json()
        
        setTechnicians(techData)
        
        // Filter out users who are already technicians
        const technicianUserIds = techData.map((t: Technician) => t.userId)
        const available = usersData.filter(
          (u: User) => !technicianUserIds.includes(u.id) && u.role !== Role.TECHNICIAN
        )
        setAvailableUsers(available)
      }
    } catch (error) {
      // console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (technician: Technician) => {
    setEditingId(technician.id)
    setEditName(technician.user.name || "")
    setEditColor(technician.color)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditName("")
    setEditColor("")
  }

  const saveTechnician = async (technicianId: string) => {
    try {
      const response = await api.patch("/api/technicians", {
        technicianId,
        name: editName,
        color: editColor,
      })

      if (response.ok) {
        fetchData()
        cancelEditing()
      }
    } catch (error) {
      // console.error("Error updating technician:", error)
    }
  }

  const addTechnician = async () => {
    if (!selectedUserId) return

    try {
      const response = await api.post("/api/technicians", {
        userId: selectedUserId,
        color: newColor,
      })

      if (response.ok) {
        fetchData()
        setShowAddForm(false)
        setSelectedUserId("")
        setNewColor("#3B82F6")
      }
    } catch (error) {
      // console.error("Error adding technician:", error)
    }
  }

  const toggleActive = async (technicianId: string, active: boolean) => {
    try {
      const response = await api.patch("/api/technicians", {
        technicianId,
        active: !active,
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      // console.error("Error toggling technician status:", error)
    }
  }

  if (loading) {
    return <div>Caricamento...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Gestione Tecnici
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestisci i tecnici e le loro impostazioni del calendario
          </p>
        </div>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi Tecnico
          </Button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-medium mb-4">Aggiungi Nuovo Tecnico</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="user-select">Seleziona Utente</Label>
              <select
                id="user-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-sm"
              >
                <option value="">Seleziona un utente...</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="color-picker">Colore Calendario</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  id="color-picker"
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="h-10 w-20"
                />
                <span className="text-sm text-gray-500">{newColor}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={addTechnician} disabled={!selectedUserId}>
                Aggiungi Tecnico
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false)
                  setSelectedUserId("")
                  setNewColor("#3B82F6")
                }}
              >
                Annulla
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid gap-4">
            {technicians.map((technician) => (
              <div
                key={technician.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg"
              >
                {editingId === technician.id ? (
                  <>
                    <div className="flex-1 grid grid-cols-1 gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nome tecnico"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="h-8 w-16"
                        />
                        <span className="text-sm text-gray-500">
                          {editColor}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:ml-4">
                      <Button
                        size="sm"
                        onClick={() => saveTechnician(technician.id)}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {technician.user.name || "Nessun nome"}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {technician.user.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: technician.color }}
                        />
                        <span className="text-xs text-gray-500">
                          {technician.color}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant={technician.active ? "default" : "secondary"}
                        onClick={() =>
                          toggleActive(technician.id, technician.active)
                        }
                      >
                        {technician.active ? "Attivo" : "Inattivo"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(technician)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}