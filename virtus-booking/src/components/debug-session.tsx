"use client"

import { useSession } from "next-auth/react"

export function DebugSession() {
  const { data: session } = useSession()
  
  if (!session) return null
  
  return (
    <div className="fixed bottom-4 left-4 bg-gray-900 text-white p-4 rounded-lg text-xs max-w-md">
      <h3 className="font-bold mb-2">Debug Session</h3>
      <pre>{JSON.stringify({
        email: session.user.email,
        role: session.user.role,
        isImpersonating: session.user.isImpersonating,
        originalUserId: session.user.originalUserId,
        originalUserEmail: session.user.originalUserEmail
      }, null, 2)}</pre>
    </div>
  )
}