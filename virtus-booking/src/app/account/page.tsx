import { AccountSettings } from '@/components/account/account-settings'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DashboardClientLayout from '../dashboard-layout'

export default async function AccountPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <DashboardClientLayout>
      <AccountSettings />
    </DashboardClientLayout>
  )
}