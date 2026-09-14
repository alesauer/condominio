"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Flame,
  Bell,
  Calendar,
  FileText,
  AlertTriangle,
  BarChart3,
  History,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
      { href: "/financeiro/receitas", label: "Receitas", icon: TrendingUp },
      { href: "/financeiro/despesas", label: "Despesas", icon: TrendingDown },
      { href: "/financeiro/cobrancas", label: "Cobranças", icon: CreditCard },
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
      { href: "/assembleias", label: "Assembleias", icon: Calendar },
      { href: "/documentos", label: "Documentos", icon: FileText },
    ],
  },
  {
    title: "Administração",
    items: [
      { href: "/inadimplencia", label: "Inadimplência", icon: AlertTriangle },
      { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
      { href: "/auditoria", label: "Auditoria", icon: History },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-200 flex flex-col",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className={cn("flex h-14 items-center border-b px-4", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="font-bold text-base">Condo Gestão</span>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={onToggle} title={collapsed ? "Expandir sidebar" : "Recolher sidebar"}>
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {menuGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!collapsed && (
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {group.title}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/overview" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
