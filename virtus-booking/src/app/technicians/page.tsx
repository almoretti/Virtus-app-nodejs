import { TechnicianManagement } from "@/components/technicians/technician-management"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Role } from "@prisma/client"
import { getEffectiveUser } from "@/lib/auth-utils"
import DashboardClientLayout from '../dashboard-layout'

export default async function TechniciansPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/auth/signin")
  }

  const effectiveUser = getEffectiveUser(session)
  if (effectiveUser.role !== Role.ADMIN) {
    redirect("/")
  }

  return (
    <DashboardClientLayout>
      <TechnicianManagement />
    </DashboardClientLayout>
  )
}