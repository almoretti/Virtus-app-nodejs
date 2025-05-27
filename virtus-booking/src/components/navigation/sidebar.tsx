"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Calendar, Users, UserCog, LogOut, List } from "lucide-react"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Calendario", href: "/", icon: Calendar },
  { name: "Appuntamenti", href: "/appointments", icon: List },
  { name: "Utenti", href: "/users", icon: Users },
  { name: "Tecnici", href: "/technicians", icon: UserCog },
]

interface SidebarProps {
  onMobileClose?: () => void
}

export function Sidebar({ onMobileClose }: SidebarProps) {
  const pathname = usePathname()

  const handleLinkClick = () => {
    if (onMobileClose) {
      onMobileClose()
    }
  }

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 relative z-50">
      <div className="flex h-16 items-center px-4">
        <h2 className="text-lg font-semibold text-white">Prenotazioni Virtus</h2>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white",
                "group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              )}
            >
              <item.icon
                className={cn(
                  isActive
                    ? "text-gray-300"
                    : "text-gray-400 group-hover:text-gray-300",
                  "mr-3 h-5 w-5"
                )}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="flex-shrink-0 p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white"
          onClick={() => signOut()}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Esci
        </Button>
      </div>
    </div>
  )
}