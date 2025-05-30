"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { useConfirm } from "@/hooks/use-confirm"
import { toast } from "sonner"
import { Plus, Copy, Eye, EyeOff, Trash2, Power, PowerOff } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

interface ApiToken {
  id: string
  name: string
  token: string
  expiresAt: string | null
  lastUsedAt: string | null
  isActive: boolean
  scopes: string[]
  createdAt: string
}

export function ApiTokenManagement() {
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newTokenData, setNewTokenData] = useState<{
    token: string
    name: string
  } | null>(null)
  const [showToken, setShowToken] = useState(false)
  const isMobile = useIsMobile()
  const { confirm, ConfirmDialog } = useConfirm()
  
  const [formData, setFormData] = useState({
    name: '',
    expiresAt: '',
    scopes: ['read', 'write'] as string[]
  })

  useEffect(() => {
    fetchTokens()
  }, [])

  const fetchTokens = async () => {
    try {
      const response = await fetch('/api/tokens')
      if (response.ok) {
        const data = await response.json()
        setTokens(data)
      } else {
        toast.error('Errore nel caricamento dei token')
      }
    } catch (error) {
      // console.error('Error fetching tokens:', error)
      toast.error('Errore nel caricamento dei token')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Nome token richiesto')
      return
    }

    try {
      const response = await fetch('/api/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          expiresAt: formData.expiresAt || null,
          scopes: formData.scopes
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setNewTokenData({
          token: data.token,
          name: data.name
        })
        setShowCreateDialog(false)
        setFormData({ name: '', expiresAt: '', scopes: ['read', 'write'] })
        fetchTokens()
        toast.success('Token creato con successo')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Errore nella creazione del token')
      }
    } catch (error) {
      // console.error('Error creating token:', error)
      toast.error('Errore nella creazione del token')
    }
  }

  const handleDeleteToken = async (tokenId: string, tokenName: string) => {
    const confirmed = await confirm({
      title: 'Elimina Token API',
      description: `Sei sicuro di voler eliminare il token "${tokenName}"? Questa azione non può essere annullata.`,
      confirmText: 'Elimina',
      cancelText: 'Annulla',
      destructive: true
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/tokens/${tokenId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchTokens()
        toast.success('Token eliminato con successo')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Errore nell\'eliminazione del token')
      }
    } catch (error) {
      // console.error('Error deleting token:', error)
      toast.error('Errore nell\'eliminazione del token')
    }
  }

  const handleToggleToken = async (tokenId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/tokens/${tokenId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !currentStatus
        }),
      })

      if (response.ok) {
        fetchTokens()
        toast.success(`Token ${!currentStatus ? 'attivato' : 'disattivato'} con successo`)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Errore nell\'aggiornamento del token')
      }
    } catch (error) {
      // console.error('Error toggling token:', error)
      toast.error('Errore nell\'aggiornamento del token')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Token copiato negli appunti')
  }

  const handleScopeChange = (scope: string, checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, scopes: [...formData.scopes, scope] })
    } else {
      setFormData({ ...formData, scopes: formData.scopes.filter(s => s !== scope) })
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Mai'
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const CreateTokenDialog = () => (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Crea Nuovo Token API</DialogTitle>
        <DialogDescription>
          Crea un nuovo token per l'accesso programmatico alle API
        </DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleCreateToken} className="space-y-4">
        <div>
          <Label htmlFor="tokenName">Nome Token</Label>
          <Input
            id="tokenName"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Es. Integrazione CRM"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="expiresAt">Data di Scadenza (Opzionale)</Label>
          <Input
            id="expiresAt"
            type="datetime-local"
            value={formData.expiresAt}
            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
          />
        </div>
        
        <div>
          <Label>Permessi</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {['read', 'write', 'admin'].map((scope) => (
              <Label key={scope} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.scopes.includes(scope)}
                  onChange={(e) => handleScopeChange(scope, e.target.checked)}
                />
                <span className="capitalize">{scope}</span>
              </Label>
            ))}
          </div>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
            Annulla
          </Button>
          <Button type="submit">
            Crea Token
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )

  if (loading) {
    return <div>Caricamento token...</div>
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Token API Attivi</h2>
          <p className="text-sm text-muted-foreground">
            {tokens.length} token{tokens.length !== 1 ? 's' : ''} configurati
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Token
            </Button>
          </DialogTrigger>
          <CreateTokenDialog />
        </Dialog>
      </div>

      {/* Show new token */}
      {newTokenData && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              Token Creato: {newTokenData.name}
            </CardTitle>
            <CardDescription className="text-green-700">
              Salva questo token in un posto sicuro. Non potrai vederlo di nuovo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                value={showToken ? newTokenData.token : '•'.repeat(32)}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(newTokenData.token)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              className="mt-2"
              variant="outline"
              onClick={() => setNewTokenData(null)}
            >
              Ho salvato il token
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Token list */}
      <div className="space-y-4">
        {tokens.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-muted-foreground">Nessun token API configurato</p>
                <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                  Crea il tuo primo token
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          tokens.map((token) => (
            <Card key={token.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{token.name}</h3>
                      <Badge variant={token.isActive ? "default" : "secondary"}>
                        {token.isActive ? 'Attivo' : 'Inattivo'}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Token: ••••••••</p>
                      <p>Creato: {formatDate(token.createdAt)}</p>
                      <p>Ultimo uso: {formatDate(token.lastUsedAt)}</p>
                      {token.expiresAt && (
                        <p>Scade: {formatDate(token.expiresAt)}</p>
                      )}
                    </div>
                    
                    <div className="flex gap-1">
                      {token.scopes.map((scope) => (
                        <Badge key={scope} variant="outline" className="text-xs">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleToggleToken(token.id, token.isActive)}
                    >
                      {token.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleDeleteToken(token.id, token.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      <ConfirmDialog />
    </>
  )
}