import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface DashboardCardsData {
  saldo_atual: number;
  receitas_mes: number;
  despesas_mes: number;
  contas_extraordinarias: number;
  inadimplencia_total: number;
}

export interface MonthlyDataItem {
  mes: string;
  valor: number;
}

export function useDashboardCards() {
  return useQuery<DashboardCardsData>({
    queryKey: ["dashboard", "cards"],
    queryFn: async () => {
      const res = await api.get("/dashboard/cards");
      return res.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useReceitasMensais(ano?: number) {
  return useQuery<MonthlyDataItem[]>({
    queryKey: ["dashboard", "receitas-mensais", ano],
    queryFn: async () => {
      const res = await api.get("/dashboard/receitas-mensais", {
        params: ano ? { ano } : undefined,
      });
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useDespesasMensais(ano?: number) {
  return useQuery<MonthlyDataItem[]>({
    queryKey: ["dashboard", "despesas-mensais", ano],
    queryFn: async () => {
      const res = await api.get("/dashboard/despesas-mensais", {
        params: ano ? { ano } : undefined,
      });
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
