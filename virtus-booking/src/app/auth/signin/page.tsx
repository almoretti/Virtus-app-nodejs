'use client'

import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8 bg-card rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Virtus Booking System</h2>
          <p className="mt-2 text-muted-foreground">
            Sign in to manage technician bookings
          </p>
        </div>
        
        <Button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="w-full"
          size="lg"
        >
          Sign in with Google
        </Button>
        
        <p className="text-sm text-center text-muted-foreground">
          Only authorized users can access this system
        </p>
      </div>
    </div>
  )
}