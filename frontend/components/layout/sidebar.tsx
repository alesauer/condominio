"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  DollarSign,
  Droplets,
  Flame,
  Bell,
  Calendar,
  FileText,
  AlertTriangle,
  BarChart3,
  History,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const menuItems = [
  { href: "/overview", label: "Dashboard", icon: LayoutDashboard },
  { href: "/apartamentos", label: "Apartamentos", icon: Building2 },
  { href: "/proprietarios", label: "Proprietários", icon: UserCheck },
  { href: "/moradores", label: "Moradores", icon: Users },
  { href: "/financeiro/receitas", label: "Receitas", icon: DollarSign },
  { href: "/financeiro/despesas", label: "Despesas", icon: DollarSign },
  { href: "/financeiro/cobrancas", label: "Cobranças", icon: DollarSign },
  { href: "/financeiro/extraordinarias", label: "Extraordinárias", icon: DollarSign },
  { href: "/agua", label: "Água", icon: Droplets },
  { href: "/gas", label: "Gás", icon: Flame },
  { href: "/avisos", label: "Avisos", icon: Bell },
  { href: "/assembleias", label: "Assembleias", icon: Calendar },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/inadimplencia", label: "Inadimplência", icon: AlertTriangle },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/auditoria", label: "Auditoria", icon: History },
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
        {!collapsed && <span className="font-bold text-lg">Condo Gestão</span>}
        <Button variant="ghost" size="icon" onClick={onToggle}>
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                isActive && "bg-accent text-accent-foreground font-medium",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
