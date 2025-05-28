import { UserManagement } from "@/components/users/user-management"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Role } from "@prisma/client"
import DashboardClientLayout from '../dashboard-layout'
import { getEffectiveUser } from "@/lib/auth-utils"

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/auth/signin")
  }

  const effectiveUser = getEffectiveUser(session)
  if (!effectiveUser || effectiveUser.role !== Role.ADMIN) {
    redirect("/")
  }

  return (
    <DashboardClientLayout>
      <UserManagement />
    </DashboardClientLayout>
  )
}