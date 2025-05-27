'use client'

import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-6 p-4 sm:p-6 md:p-8 bg-card rounded-lg shadow-lg mx-4">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold">Sistema di Prenotazione Virtus</h2>
          <p className="mt-2 text-muted-foreground">
            Accedi per gestire le prenotazioni dei tecnici
          </p>
        </div>
        
        <Button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="w-full"
          size="lg"
        >
          Accedi con Google
        </Button>
        
        <p className="text-sm text-center text-muted-foreground">
          Solo gli utenti autorizzati possono accedere a questo sistema
        </p>
      </div>
    </div>
  )
}