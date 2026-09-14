"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Building2,
  Users,
  TrendingDown,
  TrendingUp,
  Receipt,
  Flame,
  Bell,
  CalendarDays,
  Files,
  CircleAlert,
  ChartNoAxesCombined,
  History,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const menuGroups = [
  {
    title: "Principal",
    items: [
      { href: "/overview", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { href: "/apartamentos", label: "Apartamentos", icon: Building2 },
      { href: "/moradores", label: "Moradores", icon: Users },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { href: "/financeiro/despesas", label: "Despesas", icon: TrendingDown },
      { href: "/financeiro/receitas", label: "Receitas", icon: TrendingUp },
      { href: "/financeiro/cobrancas", label: "Cobranças", icon: Receipt },
    ],
  },
  {
    title: "Consumo",
    items: [
      { href: "/gas", label: "Gás", icon: Flame },
    ],
  },
  {
    title: "Comunicação",
    items: [
      { href: "/avisos", label: "Avisos", icon: Bell },
      { href: "/assembleias", label: "Assembleias", icon: CalendarDays },
      { href: "/documentos", label: "Documentos", icon: Files },
    ],
  },
  {
    title: "Administração",
    items: [
      { href: "/inadimplencia", label: "Inadimplência", icon: CircleAlert },
      { href: "/relatorios", label: "Relatórios", icon: ChartNoAxesCombined },
      { href: "/auditoria", label: "Auditoria", icon: History },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-slate-200 bg-white transition-all duration-200 flex flex-col select-none",
        collapsed ? "w-18" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className={cn(
        "flex h-16 items-center border-b border-slate-100 px-4",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed ? (
          <Link href="/overview" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white shadow-xs group-hover:bg-primary-700 transition-colors">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm text-slate-900 tracking-tight leading-none">
                Condo Gestão
              </span>
              <span className="text-[11px] text-slate-400 font-medium mt-0.5">
                Gestão Condominial
              </span>
            </div>
          </Link>
        ) : (
          <Link href="/overview" className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white shadow-xs">
            <Building2 className="h-5 w-5" />
          </Link>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md"
          title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5 scrollbar-thin">
        {menuGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!collapsed && (
              <div className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                {group.title}
              </div>
            )}
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/overview" && pathname.startsWith(item.href))
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all group relative",
                    isActive
                      ? "bg-primary-50 text-primary-600 font-semibold shadow-2xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    collapsed && "justify-center px-0 h-10 w-10 mx-auto"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      isActive
                        ? "text-primary-600"
                        : "text-slate-400 group-hover:text-slate-600"
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer / Status */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 px-2 py-1 text-[11px] text-slate-500 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Sistema Seguro • v2.0</span>
          </div>
        </div>
      )}
    </aside>
  )
}
