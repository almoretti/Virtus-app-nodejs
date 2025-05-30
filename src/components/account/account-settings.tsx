"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { User } from "lucide-react"
import * as api from '@/lib/api-client'

export function AccountSettings() {
  const { data: session, update } = useSession()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  })

  useEffect(() => {
    if (session?.user) {
      setFormData({
        name: session.user.name || "",
        email: session.user.email || "",
      })
    }
  }, [session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await api.put(`/api/users/${session?.user?.id}`, {
        name: formData.name,
        email: formData.email,
        role: session?.user?.role, // Keep the same role
      })

      if (response.ok) {
        toast.success("Profilo aggiornato con successo")
        // Update the session with new data
        await update({
          name: formData.name,
          email: formData.email,
        })
      } else {
        const error = await response.json()
        toast.error(error.error || "Errore durante l'aggiornamento del profilo")
      }
    } catch (error) {
      // console.error("Error updating profile:", error)
      toast.error("Errore durante l'aggiornamento del profilo")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Il Mio Account</h1>
        <p className="mt-1 text-sm text-gray-600">
          Gestisci le informazioni del tuo profilo
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informazioni Personali
          </CardTitle>
          <CardDescription>
            Aggiorna le tue informazioni personali
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Il tuo nome"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm text-muted-foreground">
                <strong>Ruolo:</strong> {
                  session?.user?.role === 'ADMIN' ? 'Amministratore' :
                  session?.user?.role === 'TECHNICIAN' ? 'Tecnico' :
                  'Servizio Clienti'
                }
              </p>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Salvataggio..." : "Salva Modifiche"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}