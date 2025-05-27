import { BookingCalendar } from '@/components/calendar/booking-calendar'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DashboardClientLayout from './dashboard-layout'

export default async function Home() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <DashboardClientLayout>
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Calendario Prenotazioni</h1>
        <BookingCalendar />
      </div>
    </DashboardClientLayout>
  )
}