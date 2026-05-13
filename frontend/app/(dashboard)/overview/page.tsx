"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Droplets,
  Flame,
  Receipt,
} from "lucide-react";

const cards = [
  { title: "Saldo Atual", value: "R$ 0,00", icon: DollarSign, color: "text-green-600" },
  { title: "Receitas do Mês", value: "R$ 0,00", icon: TrendingUp, color: "text-blue-600" },
  { title: "Despesas do Mês", value: "R$ 0,00", icon: TrendingDown, color: "text-red-600" },
  { title: "Inadimplência", value: "R$ 0,00", icon: AlertTriangle, color: "text-orange-600" },
  { title: "Contas Extraordinárias", value: "R$ 0,00", icon: Receipt, color: "text-purple-600" },
  { title: "Consumo de Água", value: "0 m³", icon: Droplets, color: "text-cyan-600" },
  { title: "Consumo de Gás", value: "0 m³", icon: Flame, color: "text-amber-600" },
];

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do condomínio</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
