import { AppointmentsList } from '@/components/appointments/appointments-list'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DashboardClientLayout from '../dashboard-layout'

export default async function AppointmentsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <DashboardClientLayout>
      <AppointmentsList />
    </DashboardClientLayout>
  )
}