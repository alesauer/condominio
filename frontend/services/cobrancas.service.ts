import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Cobranca } from "@/types/financeiro";
import type { PaginatedResponse } from "@/types";

const KEY = "cobrancas";

export interface GerarCobrancasPayload {
  competencia: string;
  vencimento: string;
  valor_base_condominio?: number;
  incluir_despesas?: boolean;
  incluir_agua?: boolean;
  incluir_gas?: boolean;
  descricao?: string;
}

export interface CobrancaPreviaApartamento {
  apartamento_id: string;
  apartamento_numero: string;
  apartamento_bloco: string | null;
  apartamento_tipo: string | null;
  fracao_ideal: number;
  valor_despesas: number;
  valor_agua: number;
  valor_gas: number;
  valor_base: number;
  valor_total: number;
  ja_gerado: boolean;
}

export interface CobrancaPreviaResult {
  competencia: string;
  vencimento: string;
  total_despesas_mes: number;
  total_agua: number;
  total_gas: number;
  total_base: number;
  total_geral: number;
  apartamentos: CobrancaPreviaApartamento[];
}

export function useCobrancas(params?: Record<string, any>) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () =>
      api.get<PaginatedResponse<Cobranca>>("/cobrancas", { params }).then((r) => r.data),
  });
}

export function usePagarCobranca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put(`/cobrancas/${id}/pagar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useGerarCobrancasMensais() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GerarCobrancasPayload) =>
      api
        .post<{
          geradas: number;
          total_despesas_mes?: number;
          total_agua?: number;
          total_gas?: number;
          total_base?: number;
          total_valor: number;
        }>("/cobrancas/gerar-mensal", data)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function usePreviaCobrancasMensais() {
  return useMutation({
    mutationFn: (data: GerarCobrancasPayload) =>
      api.post<CobrancaPreviaResult>("/cobrancas/previa-mensal", data).then((r) => r.data),
  });
}

