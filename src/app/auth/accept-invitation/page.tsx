'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export default function AcceptInvitation() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired'>('loading')
  const [invitationData, setInvitationData] = useState<any>(null)

  useEffect(() => {
    if (token) {
      checkInvitation(token)
    } else {
      setStatus('invalid')
    }
  }, [token])

  const checkInvitation = async (token: string) => {
    try {
      const response = await fetch(`/api/invitations/validate?token=${token}`)
      const data = await response.json()

      if (response.ok) {
        setInvitationData(data)
        setStatus('valid')
      } else if (response.status === 410) {
        setStatus('expired')
      } else {
        setStatus('invalid')
      }
    } catch (error) {
      // console.error('Error checking invitation:', error)
      setStatus('invalid')
    }
  }

  const handleAcceptInvitation = () => {
    // Store the token in sessionStorage to complete registration after Google sign-in
    if (token) {
      sessionStorage.setItem('invitationToken', token)
      signIn('google', { callbackUrl: '/auth/complete-registration' })
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Verifica invito...</p>
        </div>
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full space-y-4 p-8 bg-card rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold text-red-600">Invito Scaduto</h2>
          <p className="text-muted-foreground">
            Questo invito è scaduto. Contatta l'amministratore per ricevere un nuovo invito.
          </p>
        </div>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full space-y-4 p-8 bg-card rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold text-red-600">Invito Non Valido</h2>
          <p className="text-muted-foreground">
            Questo invito non è valido. Verifica il link o contatta l'amministratore.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-6 p-8 bg-card rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Benvenuto!</h2>
          <p className="mt-2 text-muted-foreground">
            Sei stato invitato a unirti al Sistema di Prenotazione Virtus
          </p>
        </div>

        {invitationData && (
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm">
              <span className="font-semibold">Email:</span> {invitationData.email}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Ruolo:</span> {
                invitationData.role === 'ADMIN' ? 'Amministratore' :
                invitationData.role === 'TECHNICIAN' ? 'Tecnico' :
                'Servizio Clienti'
              }
            </p>
          </div>
        )}

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Clicca il pulsante qui sotto per accettare l'invito e completare la registrazione
            con il tuo account Google.
          </p>
          
          <Button
            onClick={handleAcceptInvitation}
            className="w-full"
            size="lg"
          >
            Accetta Invito e Accedi con Google
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Assicurati di utilizzare l'indirizzo email {invitationData?.email} quando accedi con Google
        </p>
      </div>
    </div>
  )
}