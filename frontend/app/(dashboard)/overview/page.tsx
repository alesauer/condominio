"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  useDashboardCards,
  useReceitasMensais,
  useDespesasMensais,
} from "@/services/dashboard.service"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { AdminGate, ReadOnlyNotice } from "@/components/auth/admin-gate"
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CircleAlert,
  PlusCircle,
  Receipt,
  Building2,
  CalendarDays,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts"

export default function OverviewPage() {
  const currentYear = new Date().getFullYear()
  const { data: cardsData, isLoading: cardsLoading, error: cardsError } = useDashboardCards()
  const { data: receitasData, isLoading: recLoading } = useReceitasMensais(currentYear)
  const { data: despesasData, isLoading: despLoading } = useDespesasMensais(currentYear)

  const chartData = useMemo(() => {
    const monthNames = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ]

    const map = new Map<string, { mes: string; label: string; receitas: number; despesas: number }>()

    for (let i = 1; i <= 12; i++) {
      const monthKey = `${currentYear}-${String(i).padStart(2, "0")}`
      map.set(monthKey, {
        mes: monthKey,
        label: monthNames[i - 1],
        receitas: 0,
        despesas: 0,
      })
    }

    receitasData?.forEach((item) => {
      if (map.has(item.mes)) {
        map.get(item.mes)!.receitas = item.valor
      }
    })

    despesasData?.forEach((item) => {
      if (map.has(item.mes)) {
        map.get(item.mes)!.despesas = item.valor
      }
    })

    return Array.from(map.values())
  }, [receitasData, despesasData, currentYear])

  const cards = [
    {
      title: "Saldo em Caixa",
      value: cardsData ? formatCurrency(cardsData.saldo_atual) : "R$ 0,00",
      description: "Receitas quitadas vs despesas pagas",
      icon: Wallet,
      color: "text-primary-600",
      bg: "bg-primary-50",
      badge: "Consolidado",
    },
    {
      title: "Receitas do Mês",
      value: cardsData ? formatCurrency(cardsData.receitas_mes) : "R$ 0,00",
      description: "Total arrecadado no mês vigente",
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      badge: "+ Arrecadação",
    },
    {
      title: "Despesas do Mês",
      value: cardsData ? formatCurrency(cardsData.despesas_mes) : "R$ 0,00",
      description: "Total liquidado no mês vigente",
      icon: TrendingDown,
      color: "text-rose-600",
      bg: "bg-rose-50",
      badge: "Liquidado",
    },
    {
      title: "Inadimplência",
      value: cardsData ? formatCurrency(cardsData.inadimplencia_total) : "R$ 0,00",
      description: "Cobranças com status em atraso",
      icon: CircleAlert,
      color: "text-amber-600",
      bg: "bg-amber-50",
      badge: "Pendente",
    },
  ]

  return (
    <div className="space-y-6">
      <ReadOnlyNotice />

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Painel Geral
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Visão financeira e operacional consolidada do condomínio
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/financeiro/cobrancas">
            <Button variant="secondary" size="sm" className="gap-2">
              <Receipt className="h-4 w-4 text-slate-600" />
              <span>Cobranças</span>
            </Button>
          </Link>
          <AdminGate>
            <Link href="/financeiro/despesas/nova">
              <Button size="sm" className="gap-2 shadow-xs">
                <PlusCircle className="h-4 w-4" />
                <span>Nova Despesa</span>
              </Button>
            </Link>
          </AdminGate>
        </div>
      </div>

      {/* KPI Cards */}
      {cardsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : cardsError ? (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4 text-sm text-red-700">
            Não foi possível carregar os indicadores do dashboard no momento.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.title} className="hover:border-slate-300 transition-all shadow-card hover:shadow-card-hover">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {card.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {card.value}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <span className="truncate">{card.description}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Main Grid: Chart & Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">
                  Demonstrativo Anual ({currentYear})
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Comparativo de Receitas e Despesas liquidadas mês a mês
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {recLoading || despLoading ? (
              <Skeleton className="h-72 w-full rounded-lg" />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="label"
                      fontSize={12}
                      tickLine={false}
                      axisLine={{ stroke: "#E2E8F0" }}
                      tick={{ fill: "#64748B" }}
                    />
                    <YAxis
                      fontSize={12}
                      tickLine={false}
                      axisLine={{ stroke: "#E2E8F0" }}
                      tick={{ fill: "#64748B" }}
                      tickFormatter={(v) => `R$ ${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <Tooltip
                      formatter={(val: number) => [formatCurrency(val), ""]}
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "10px",
                        border: "1px solid #E2E8F0",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.08)",
                        color: "#0F172A",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: "14px", fontSize: "12px" }}
                    />
                    <Bar dataKey="receitas" name="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesas" name="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Panel */}
        <Card className="shadow-card">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900">
              Ações Rápidas
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Acesso direto aos principais fluxos de gestão
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-4">
            <Link href="/apartamentos" className="block group">
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary-50 text-primary-600">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900">Apartamentos</div>
                    <div className="text-[11px] text-slate-500">Unidades e proprietários</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-primary-600 transition-colors" />
              </div>
            </Link>

            <Link href="/financeiro/cobrancas" className="block group">
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-emerald-50 text-emerald-600">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900">Gestão de Cobranças</div>
                    <div className="text-[11px] text-slate-500">Boletos e demonstrativo</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </div>
            </Link>

            <Link href="/gas" className="block group">
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-amber-50 text-amber-600">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900">Consumo de Gás</div>
                    <div className="text-[11px] text-slate-500">Planilha e leituras mensais</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
              </div>
            </Link>

            <Link href="/inadimplencia" className="block group">
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-rose-50 text-rose-600">
                    <CircleAlert className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900">Inadimplência</div>
                    <div className="text-[11px] text-slate-500">Cobranças vencidas e atrasos</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
