import { ApiTokenManagement } from "@/components/api-tokens/api-token-management"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getEffectiveUser } from "@/lib/auth-utils"
import DashboardClientLayout from "../dashboard-layout"

export default async function ApiTokensPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/auth/signin")
  }

  // Only admins can manage API tokens
  const effectiveUser = getEffectiveUser(session)
  if (effectiveUser.role !== "ADMIN") {
    redirect("/")
  }

  return (
    <DashboardClientLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Token API</h1>
          <p className="text-muted-foreground">
            Gestisci i token API per l'accesso programmatico alle API del sistema
          </p>
        </div>
        
        <ApiTokenManagement />
      </div>
    </DashboardClientLayout>
  )
}