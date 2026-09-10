"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  useDashboardCards,
  useReceitasMensais,
  useDespesasMensais,
} from "@/services/dashboard.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  PlusCircle,
  CreditCard,
  Building2,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export default function OverviewPage() {
  const currentYear = new Date().getFullYear();
  const { data: cardsData, isLoading: cardsLoading, error: cardsError } = useDashboardCards();
  const { data: receitasData, isLoading: recLoading } = useReceitasMensais(currentYear);
  const { data: despesasData, isLoading: despLoading } = useDespesasMensais(currentYear);

  const chartData = useMemo(() => {
    const monthNames = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];

    const map = new Map<string, { mes: string; label: string; receitas: number; despesas: number }>();

    for (let i = 1; i <= 12; i++) {
      const monthKey = `${currentYear}-${String(i).padStart(2, "0")}`;
      map.set(monthKey, {
        mes: monthKey,
        label: monthNames[i - 1],
        receitas: 0,
        despesas: 0,
      });
    }

    receitasData?.forEach((item) => {
      if (map.has(item.mes)) {
        map.get(item.mes)!.receitas = item.valor;
      }
    });

    despesasData?.forEach((item) => {
      if (map.has(item.mes)) {
        map.get(item.mes)!.despesas = item.valor;
      }
    });

    return Array.from(map.values());
  }, [receitasData, despesasData, currentYear]);

  const cards = [
    {
      title: "Saldo Atual",
      value: cardsData ? formatCurrency(cardsData.saldo_atual) : "R$ 0,00",
      description: "Receitas pagas vs Despesas pagas",
      icon: DollarSign,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Receitas do Mês",
      value: cardsData ? formatCurrency(cardsData.receitas_mes) : "R$ 0,00",
      description: "Total arrecadado no mês vigente",
      icon: TrendingUp,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Despesas do Mês",
      value: cardsData ? formatCurrency(cardsData.despesas_mes) : "R$ 0,00",
      description: "Total liquidado no mês vigente",
      icon: TrendingDown,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
    },
    {
      title: "Inadimplência",
      value: cardsData ? formatCurrency(cardsData.inadimplencia_total) : "R$ 0,00",
      description: "Cobranças com status em atraso",
      icon: AlertTriangle,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão consolidada financeira e operacional do condomínio
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/financeiro/cobrancas">
            <Button variant="outline" size="sm">
              <CreditCard className="mr-2 h-4 w-4" /> Cobranças
            </Button>
          </Link>
          <Link href="/financeiro/despesas/nova">
            <Button size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Nova Despesa
            </Button>
          </Link>
        </div>
      </div>

      {cardsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : cardsError ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            Não foi possível carregar os indicadores do dashboard no momento.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Demonstrativo Mensal ({currentYear})</CardTitle>
                <CardDescription>
                  Comparativo de Receitas e Despesas liquidadas mês a mês
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {recLoading || despLoading ? (
              <Skeleton className="h-72 w-full rounded-lg" />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `R$ ${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <Tooltip
                      formatter={(val: number) => [formatCurrency(val), ""]}
                      contentStyle={{
                        backgroundColor: "rgba(23, 23, 23, 0.95)",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#fff",
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: "12px" }} />
                    <Bar dataKey="receitas" name="Receitas (R$)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesas" name="Despesas (R$)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Atalhos operacionais do condomínio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/apartamentos" className="block">
              <Button variant="outline" className="w-full justify-start text-left h-auto py-3">
                <Building2 className="mr-3 h-5 w-5 text-primary shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Apartamentos</div>
                  <div className="text-xs text-muted-foreground">Consultar unidades e proprietários</div>
                </div>
              </Button>
            </Link>

            <Link href="/financeiro/cobrancas" className="block">
              <Button variant="outline" className="w-full justify-start text-left h-auto py-3">
                <CreditCard className="mr-3 h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Gestão de Cobranças</div>
                  <div className="text-xs text-muted-foreground">Gerar boletos e baixar faturas</div>
                </div>
              </Button>
            </Link>

            <Link href="/inadimplencia" className="block">
              <Button variant="outline" className="w-full justify-start text-left h-auto py-3">
                <AlertTriangle className="mr-3 h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Inadimplência</div>
                  <div className="text-xs text-muted-foreground">Regras de juros, multas e atrasos</div>
                </div>
              </Button>
            </Link>

            <Link href="/assembleias" className="block">
              <Button variant="outline" className="w-full justify-start text-left h-auto py-3">
                <Calendar className="mr-3 h-5 w-5 text-blue-500 shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Assembleias</div>
                  <div className="text-xs text-muted-foreground">Pautas, atas e reuniões</div>
                </div>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
