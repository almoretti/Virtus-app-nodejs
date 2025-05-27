import { UserManagement } from "@/components/users/user-management"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Role } from "@prisma/client"
import DashboardClientLayout from '../dashboard-layout'

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/auth/signin")
  }

  if (session.user.role !== Role.ADMIN) {
    redirect("/")
  }

  return (
    <DashboardClientLayout>
      <UserManagement />
    </DashboardClientLayout>
  )
}