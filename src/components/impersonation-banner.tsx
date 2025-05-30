"use client"

import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { X, UserCheck } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function ImpersonationBanner() {
  const { data: session } = useSession()
  const router = useRouter()

  if (!session?.user?.isImpersonating) {
    return null
  }

  const handleStopImpersonation = async () => {
    try {
      const response = await fetch("/api/impersonate", {
        method: "DELETE"
      })

      if (response.ok) {
        toast.success("Impersonazione terminata")
        // Force a hard refresh to reload the session
        window.location.reload()
      } else {
        toast.error("Errore nel terminare l'impersonazione")
      }
    } catch (error) {
      // console.error("Error stopping impersonation:", error)
      toast.error("Errore nel terminare l'impersonazione")
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          <span className="text-sm font-medium">
            Stai impersonando: <strong>{session.user.email}</strong>
          </span>
          {session.user.originalUserEmail && (
            <span className="text-sm opacity-75">
              (Account originale: {session.user.originalUserEmail})
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleStopImpersonation}
          className="bg-white text-blue-600 hover:bg-gray-100"
        >
          <X className="h-4 w-4 mr-1" />
          Termina impersonazione
        </Button>
      </div>
    </div>
  )
}