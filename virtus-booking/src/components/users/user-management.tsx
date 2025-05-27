"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Role } from "@prisma/client"
import { useSession } from "next-auth/react"
import { Plus, Mail, Copy, X, Edit2, Trash2 } from "lucide-react"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useConfirm } from '@/hooks/use-confirm'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  name: string | null
  role: Role
  technician: any | null
  createdAt: string
}

interface Invitation {
  id: string
  email: string
  role: Role
  expiresAt: string
  acceptedAt?: string | null
  invitedBy: {
    name: string | null
    email: string
  }
  createdAt: string
}

export function UserManagement() {
  const { data: session } = useSession()
  const { confirm, ConfirmDialog } = useConfirm()
  const [users, setUsers] = useState<User[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showEditDrawer, setShowEditDrawer] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: Role.CUSTOMER_SERVICE,
  })
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: Role.CUSTOMER_SERVICE,
  })

  useEffect(() => {
    fetchUsers()
    fetchInvitations()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInvitations = async () => {
    try {
      const response = await fetch("/api/invitations")
      if (response.ok) {
        const data = await response.json()
        setInvitations(data.filter((inv: Invitation) => !inv.acceptedAt))
      }
    } catch (error) {
      console.error("Error fetching invitations:", error)
    }
  }

  const updateUserRole = async (userId: string, role: Role) => {
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, role }),
      })

      if (response.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error("Error updating user role:", error)
    }
  }

  const sendInvitation = async () => {
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(inviteForm),
      })

      if (response.ok) {
        const data = await response.json()
        fetchInvitations()
        setInviteForm({ email: "", role: Role.CUSTOMER_SERVICE })
        setShowInviteDialog(false)
        toast.success("Invito inviato! L'utente riceverà un'email con le istruzioni.")
      } else {
        const error = await response.json()
        toast.error(error.error || "Errore invio invito")
      }
    } catch (error) {
      console.error("Error sending invitation:", error)
      toast.error("Errore invio invito")
    }
  }

  const deleteInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/invitations?id=${invitationId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchInvitations()
      }
    } catch (error) {
      console.error("Error deleting invitation:", error)
    }
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setEditForm({
      name: user.name || "",
      email: user.email,
      role: user.role,
    })
    setShowEditDrawer(true)
  }

  const handleUpdateUser = async () => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      })

      if (response.ok) {
        setShowEditDrawer(false)
        fetchUsers()
        toast.success("Utente aggiornato con successo")
      } else {
        const error = await response.json()
        toast.error(error.error || "Errore durante l'aggiornamento dell'utente")
      }
    } catch (error) {
      console.error("Error updating user:", error)
      toast.error("Errore durante l'aggiornamento dell'utente")
    }
  }

  const handleDeleteUser = async (userId: string) => {
    const confirmed = await confirm({
      title: "Elimina Utente",
      description: "Sei sicuro di voler eliminare questo utente? Questa azione non può essere annullata.",
      confirmText: "Elimina",
      cancelText: "Annulla",
      destructive: true,
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchUsers()
        toast.success("Utente eliminato con successo")
      } else {
        const error = await response.json()
        toast.error(error.error || "Errore durante l'eliminazione dell'utente")
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      toast.error("Errore durante l'eliminazione dell'utente")
    }
  }

  if (loading) {
    return <div>Caricamento...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestione Utenti</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestisci gli account utente e i loro ruoli
          </p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Invita Utente
        </Button>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid gap-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg"
              >
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {user.name || "Nessun nome"}
                  </h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`role-${user.id}`} className="sr-only">
                      Ruolo
                    </Label>
                    <select
                      id={`role-${user.id}`}
                      value={user.role}
                      onChange={(e) =>
                        updateUserRole(user.id, e.target.value as Role)
                      }
                      className="mt-1 block w-full sm:w-auto rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-sm"
                      disabled={user.id === session?.user?.id}
                    >
                      <option value={Role.ADMIN}>Amministratore</option>
                      <option value={Role.CUSTOMER_SERVICE}>
                        Servizio Clienti
                      </option>
                      <option value={Role.TECHNICIAN}>Tecnico</option>
                    </select>
                    {user.technician && (
                      <span className="text-xs text-gray-500">
                        (Ha profilo tecnico)
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditUser(user)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {user.id !== session?.user?.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Inviti in Sospeso
            </h3>
            <div className="grid gap-4">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg bg-yellow-50 border-yellow-200"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {invitation.email}
                    </p>
                    <p className="text-sm text-gray-500">
                      Ruolo: {
                        invitation.role === Role.ADMIN ? "Amministratore" :
                        invitation.role === Role.TECHNICIAN ? "Tecnico" :
                        "Servizio Clienti"
                      }
                    </p>
                    <p className="text-xs text-gray-500">
                      Invitato da {invitation.invitedBy.name || invitation.invitedBy.email}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteInvitation(invitation.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md" aria-describedby="invite-dialog-description">
          <DialogHeader>
            <DialogTitle>Invita Nuovo Utente</DialogTitle>
            <div id="invite-dialog-description" className="sr-only">
              Finestra per invitare un nuovo utente al sistema
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="utente@esempio.com"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="invite-role">Ruolo</Label>
              <select
                id="invite-role"
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as Role })}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-sm"
              >
                <option value={Role.ADMIN}>Amministratore</option>
                <option value={Role.CUSTOMER_SERVICE}>Servizio Clienti</option>
                <option value={Role.TECHNICIAN}>Tecnico</option>
              </select>
            </div>


            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInviteDialog(false)
                  setInviteForm({ email: "", role: Role.CUSTOMER_SERVICE })
                }}
              >
                Chiudi
              </Button>
              <Button
                onClick={sendInvitation}
                disabled={!inviteForm.email}
              >
                <Mail className="h-4 w-4 mr-2" />
                Invia Invito
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Drawer */}
      <Drawer open={showEditDrawer} onOpenChange={setShowEditDrawer}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle>Modifica Utente</DrawerTitle>
              <DrawerDescription>
                Aggiorna i dati dell'utente
              </DrawerDescription>
            </DrawerHeader>
            
            <div className="px-4 pb-4 space-y-4">
              <div>
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Nome utente"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="edit-role">Ruolo</Label>
                <select
                  id="edit-role"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
                  className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-sm"
                  disabled={selectedUser?.id === session?.user?.id}
                >
                  <option value={Role.ADMIN}>Amministratore</option>
                  <option value={Role.CUSTOMER_SERVICE}>Servizio Clienti</option>
                  <option value={Role.TECHNICIAN}>Tecnico</option>
                </select>
              </div>
            </div>
            
            <DrawerFooter>
              <div className="flex gap-2 w-full">
                <DrawerClose asChild>
                  <Button variant="outline" className="flex-1">
                    Annulla
                  </Button>
                </DrawerClose>
                <Button onClick={handleUpdateUser} className="flex-1">
                  Aggiorna
                </Button>
              </div>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      <ConfirmDialog />
    </div>
  )
}