"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import {
  Search,
  LogOut,
  User,
  Shield,
  Building,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface HeaderProps {
  onOpenCommandMenu?: () => void
}

export function Header({ onOpenCommandMenu }: HeaderProps) {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const getInitials = (name?: string) => {
    if (!name) return "U"
    const parts = name.trim().split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-md">
      {/* Left: Quick Search Bar trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenCommandMenu}
          className="flex h-9 w-64 md:w-80 items-center justify-between rounded-lg border border-slate-200 bg-slate-50/75 px-3 text-xs text-slate-500 hover:border-slate-300 hover:bg-slate-100/80 transition-all cursor-pointer shadow-2xs group"
          title="Atalho: Ctrl+K / ⌘K"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            <span className="font-normal text-slate-500">Buscar no sistema...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-200 shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Condominium context + User profile */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 font-medium">
          <Building className="h-3.5 w-3.5 text-primary-600" />
          <span>Edifício Residencial</span>
        </div>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold border border-primary-200">
                {getInitials(user?.nome)}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-900 leading-tight">
                  {user?.nome || "Usuário"}
                </span>
                <span className="text-[10px] text-slate-500 capitalize leading-tight">
                  {user?.role || "Administrador"}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-semibold text-slate-900">{user?.nome}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-xs" onClick={() => router.push("/overview")}>
              <User className="h-3.5 w-3.5 text-slate-500" />
              <span>Meu Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs" onClick={() => router.push("/auditoria")}>
              <Shield className="h-3.5 w-3.5 text-slate-500" />
              <span>Registro de Auditoria</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-xs text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sair da conta</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
