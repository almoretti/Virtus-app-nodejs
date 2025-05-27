"use client"

import { AppSidebar } from "@/components/navigation/app-sidebar"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"

export default function DashboardClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}