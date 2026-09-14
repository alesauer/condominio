"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { CommandMenu } from "@/components/layout/command-menu"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commandMenuOpen, setCommandMenuOpen] = useState(false)
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login")
    }
  }, [user, isLoading, router])

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          <span className="text-xs font-medium text-slate-500">Carregando Condo Gestão...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 print:bg-white antialiased">
      <div className="print:hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <CommandMenu
          open={commandMenuOpen}
          onOpenChange={setCommandMenuOpen}
        />
      </div>

      <div
        className={`${
          sidebarCollapsed ? "ml-18" : "ml-64"
        } min-h-screen flex flex-col transition-all duration-200 print:ml-0 print:m-0 print:p-0`}
      >
        <div className="print:hidden">
          <Header onOpenCommandMenu={() => setCommandMenuOpen(true)} />
        </div>
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto print:p-0 print:m-0">
          {children}
        </main>
      </div>
    </div>
  )
}
