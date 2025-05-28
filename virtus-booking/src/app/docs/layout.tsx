import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardClientLayout from "../dashboard-layout"
import Link from "next/link"
import { cn } from "@/lib/utils"

const docsNavigation = [
  {
    title: "Introduzione",
    href: "/docs"
  },
  {
    title: "API Reference",
    items: [
      { title: "Autenticazione", href: "/docs/api/auth" },
      { title: "Token API", href: "/docs/api/tokens" },
      { title: "Prenotazioni", href: "/docs/api/bookings" },
      { title: "Disponibilità", href: "/docs/api/availability" },
      { title: "Utenti", href: "/docs/api/users" },
      { title: "Tecnici", href: "/docs/api/technicians" },
      { title: "Inviti", href: "/docs/api/invitations" }
    ]
  }
]

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/auth/signin")
  }

  // Only admins can view documentation
  if (session.user.role !== "ADMIN") {
    redirect("/")
  }

  return (
    <DashboardClientLayout>
      <div className="container mx-auto flex gap-6 py-6">
        <aside className="w-64 shrink-0">
          <nav className="sticky top-6 space-y-6">
            {docsNavigation.map((section) => (
              <div key={section.title}>
                {section.href ? (
                  <Link
                    href={section.href}
                    className="font-semibold hover:underline"
                  >
                    {section.title}
                  </Link>
                ) : (
                  <h3 className="font-semibold">{section.title}</h3>
                )}
                {section.items && (
                  <ul className="mt-2 space-y-2 border-l pl-4">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="text-sm text-muted-foreground hover:text-foreground"
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            {children}
          </div>
        </main>
      </div>
    </DashboardClientLayout>
  )
}