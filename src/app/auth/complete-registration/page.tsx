'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function CompleteRegistration() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated' && session?.user && !completing) {
      completeRegistration()
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [session, status])

  const completeRegistration = async () => {
    setCompleting(true)
    const token = sessionStorage.getItem('invitationToken')
    
    if (!token) {
      router.push('/')
      return
    }

    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      if (response.ok) {
        sessionStorage.removeItem('invitationToken')
        router.push('/')
      } else {
        const data = await response.json()
        setError(data.error || 'Errore completamento registrazione')
      }
    } catch (error) {
      // console.error('Error completing registration:', error)
      setError('Errore completamento registrazione')
    }
  }

  if (status === 'loading' || completing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Completamento registrazione...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full space-y-4 p-8 bg-card rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold text-red-600">Errore</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return null
}