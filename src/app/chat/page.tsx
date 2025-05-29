import { Chat } from "@/components/chat/chat"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardClientLayout from "../dashboard-layout"

export default async function ChatPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <DashboardClientLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Assistente Prenotazioni</h1>
          <p className="text-muted-foreground">
            Chatta con il nostro assistente AI per prenotare, modificare o cancellare appuntamenti
          </p>
        </div>
        
        <Chat 
          currentUser={{
            name: session.user.name || undefined,
            email: session.user.email || undefined,
            image: session.user.image || undefined
          }}
        />
      </div>
    </DashboardClientLayout>
  )
}