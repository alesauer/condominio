"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
  Search,
  PlusCircle,
  ArrowRight,
} from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const navigationItems = [
  { group: "Navegação", title: "Dashboard", href: "/overview", icon: LayoutDashboard, keywords: "painel resumo kpis" },
  { group: "Navegação", title: "Apartamentos", href: "/apartamentos", icon: Building2, keywords: "unidades blocos" },
  { group: "Navegação", title: "Moradores", href: "/moradores", icon: Users, keywords: "inquilinos proprietarios contatos" },
  { group: "Navegação", title: "Despesas", href: "/financeiro/despesas", icon: TrendingDown, keywords: "gastos contas fornecedores notas" },
  { group: "Navegação", title: "Receitas", href: "/financeiro/receitas", icon: TrendingUp, keywords: "entradas rateio recebimentos" },
  { group: "Navegação", title: "Cobranças", href: "/financeiro/cobrancas", icon: Receipt, keywords: "boletos demonstrativo faturas lote" },
  { group: "Navegação", title: "Consumo de Gás", href: "/gas", icon: Flame, keywords: "leitura medicao botijao glp" },
  { group: "Navegação", title: "Mural de Avisos", href: "/avisos", icon: Bell, keywords: "comunicados alertas informativos" },
  { group: "Navegação", title: "Assembleias", href: "/assembleias", icon: CalendarDays, keywords: "reunioes atas votacao" },
  { group: "Navegação", title: "Documentos", href: "/documentos", icon: Files, keywords: "arquivos contratos regimento" },
  { group: "Navegação", title: "Inadimplência", href: "/inadimplencia", icon: CircleAlert, keywords: "devedores atrasos dividas" },
  { group: "Navegação", title: "Relatórios", href: "/relatorios", icon: ChartNoAxesCombined, keywords: "demonstrativos analise exportacao" },
  { group: "Navegação", title: "Auditoria", href: "/auditoria", icon: History, keywords: "logs historico alteracoes" },
]

const quickActions = [
  { group: "Ações Rápidas", title: "Cadastrar Apartamento", href: "/apartamentos?action=new", icon: PlusCircle },
  { group: "Ações Rápidas", title: "Cadastrar Morador", href: "/moradores?action=new", icon: PlusCircle },
  { group: "Ações Rápidas", title: "Lançar Nova Despesa", href: "/financeiro/despesas?action=new", icon: PlusCircle },
  { group: "Ações Rápidas", title: "Gerar Lote de Cobranças", href: "/financeiro/cobrancas", icon: Receipt },
  { group: "Ações Rápidas", title: "Registrar Leitura de Gás", href: "/gas", icon: Flame },
]

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [selectedIndex, setSelectedIndex] = React.useState(0)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, onOpenChange])

  React.useEffect(() => {
    if (!open) {
      setQuery("")
      setSelectedIndex(0)
    }
  }, [open])

  const filteredNav = React.useMemo(() => {
    if (!query.trim()) return navigationItems
    const q = query.toLowerCase()
    return navigationItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.keywords && item.keywords.toLowerCase().includes(q))
    )
  }, [query])

  const filteredActions = React.useMemo(() => {
    if (!query.trim()) return quickActions
    const q = query.toLowerCase()
    return quickActions.filter((item) =>
      item.title.toLowerCase().includes(q)
    )
  }, [query])

  const allFiltered = [...filteredNav, ...filteredActions]

  const handleSelect = (href: string) => {
    onOpenChange(false)
    router.push(href)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % (allFiltered.length || 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + allFiltered.length) % (allFiltered.length || 1))
    } else if (e.key === "Enter" && allFiltered[selectedIndex]) {
      e.preventDefault()
      handleSelect(allFiltered[selectedIndex].href)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-xl overflow-hidden border border-slate-200 shadow-dropdown">
        <div className="flex items-center border-b border-slate-100 px-3.5 py-2.5">
          <Search className="mr-2.5 h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar páginas, comandos ou atalhos (↑ ↓ para navegar)..."
            className="flex h-10 w-full rounded-md bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex select-none items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filteredNav.length > 0 && (
            <div className="mb-2">
              <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Navegação
              </div>
              <div className="space-y-0.5">
                {filteredNav.map((item, idx) => {
                  const Icon = item.icon
                  const isSelected = idx === selectedIndex
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleSelect(item.href)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm text-left transition-colors ${
                        isSelected
                          ? "bg-primary-50 text-primary-700 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 ${isSelected ? "text-primary-600" : "text-slate-400"}`} />
                        <span>{item.title}</span>
                      </div>
                      <ArrowRight className={`h-3.5 w-3.5 opacity-0 ${isSelected ? "opacity-100 text-primary-600" : ""}`} />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {filteredActions.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Ações Rápidas
              </div>
              <div className="space-y-0.5">
                {filteredActions.map((item, idx) => {
                  const Icon = item.icon
                  const adjustedIdx = filteredNav.length + idx
                  const isSelected = adjustedIdx === selectedIndex
                  return (
                    <button
                      key={item.title}
                      onClick={() => handleSelect(item.href)}
                      onMouseEnter={() => setSelectedIndex(adjustedIdx)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm text-left transition-colors ${
                        isSelected
                          ? "bg-primary-50 text-primary-700 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 ${isSelected ? "text-primary-600" : "text-slate-400"}`} />
                        <span>{item.title}</span>
                      </div>
                      <ArrowRight className={`h-3.5 w-3.5 opacity-0 ${isSelected ? "opacity-100 text-primary-600" : ""}`} />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {allFiltered.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-400">
              Nenhum resultado encontrado para &quot;{query}&quot;
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/75 px-3.5 py-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded bg-white px-1 py-0.5 border border-slate-200 shadow-2xs">↑</kbd>{" "}
              <kbd className="rounded bg-white px-1 py-0.5 border border-slate-200 shadow-2xs">↓</kbd> navegar
            </span>
            <span>
              <kbd className="rounded bg-white px-1.5 py-0.5 border border-slate-200 shadow-2xs">↵</kbd> selecionar
            </span>
          </div>
          <span>Condo Gestão • Navegação Rápida</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
