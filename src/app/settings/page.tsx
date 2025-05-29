import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DashboardClientLayout from '../dashboard-layout'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCog, User } from 'lucide-react'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  const isAdmin = session.user.role === 'ADMIN'

  return (
    <DashboardClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Impostazioni</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestisci le impostazioni del sistema
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/account">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Il Mio Account
                </CardTitle>
                <CardDescription>
                  Gestisci le informazioni del tuo profilo
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          {isAdmin && (
            <>
              <Link href="/users">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Gestione Utenti
                    </CardTitle>
                    <CardDescription>
                      Gestisci gli account utente e i loro ruoli
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/technicians">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCog className="h-5 w-5" />
                      Gestione Tecnici
                    </CardTitle>
                    <CardDescription>
                      Gestisci i tecnici e le loro impostazioni
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </>
          )}
        </div>
      </div>
    </DashboardClientLayout>
  )
}