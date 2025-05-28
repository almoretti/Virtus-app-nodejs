"use client"

import * as React from "react"
import { Calendar, Home, Settings, User, List, Users, UserCog, ChevronUp, MessageCircle, BookOpen, Key } from "lucide-react"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"

const navigation = {
  main: [
    {
      title: "Calendario",
      icon: Calendar,
      href: "/",
    },
    {
      title: "Appuntamenti",
      icon: List,
      href: "/appointments",
    },
    {
      title: "Chat Assistenza",
      icon: MessageCircle,
      href: "/chat",
    },
  ],
  settings: [
    {
      title: "Impostazioni",
      icon: Settings,
      items: [
        {
          title: "Gestione Utenti",
          href: "/users",
          icon: Users,
          adminOnly: true,
        },
        {
          title: "Gestione Tecnici",
          href: "/technicians",
          icon: UserCog,
          adminOnly: true,
        },
        {
          title: "Documentazione API",
          href: "/docs",
          icon: BookOpen,
          adminOnly: true,
        },
        {
          title: "Token API",
          href: "/api-tokens",
          icon: Key,
          adminOnly: true,
        },
      ],
    },
  ],
}

export function AppSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  // When impersonating, use the impersonated user's role
  const isAdmin = session?.user?.role === "ADMIN" && !session?.user?.isImpersonating

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Calendar className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Virtus Booking</span>
                  <span className="text-xs">Sistema Prenotazioni</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principale</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.main.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Amministrazione</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.settings.map((group) => (
                  <SidebarMenuItem key={group.title}>
                    <SidebarMenuButton>
                      <group.icon className="size-4" />
                      <span>{group.title}</span>
                    </SidebarMenuButton>
                    <SidebarMenuSub>
                      {group.items.map((item) => (
                        <SidebarMenuSubItem key={item.href}>
                          <SidebarMenuSubButton asChild isActive={pathname === item.href}>
                            <Link href={item.href}>
                              <item.icon className="size-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <User className="size-4" />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {session?.user?.name || session?.user?.email}
                    </span>
                    <span className="truncate text-xs">
                      {session?.user?.role === 'ADMIN' ? 'Amministratore' :
                       session?.user?.role === 'TECHNICIAN' ? 'Tecnico' :
                       'Servizio Clienti'}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="top"
                align="start"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link href="/account">
                    <User className="mr-2 size-4" />
                    Il Mio Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  Esci
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  )
}