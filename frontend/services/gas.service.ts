import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { PaginatedResponse } from "@/types";

const KEY = "gas";

export interface LeituraGasPlanilhaItem {
  apartamento_id: string;
  apartamento_numero: string;
  apartamento_bloco?: string | null;
  leitura_anterior: number | null;
  leitura_atual: number | null;
  consumo: number | null;
  valor_unitario: number | null;
  valor_cobrado: number | null;
  observacao?: string | null;
  leitura_id?: string | null;
}

export interface LeituraGasPlanilhaResponse {
  competencia: string;
  competencia_formatada: string;
  valor_unitario_padrao: number;
  total_consumo_m3: number;
  total_valor_cobrado: number;
  itens: LeituraGasPlanilhaItem[];
}

export interface LeituraGasSalvarItem {
  apartamento_id: string;
  leitura_anterior?: number | null;
  leitura_atual?: number | null;
  valor_unitario?: number | null;
  observacao?: string | null;
}

export interface LeituraGasSalvarLotePayload {
  competencia: string;
  valor_unitario_padrao?: number | null;
  leituras: LeituraGasSalvarItem[];
}

export interface LeituraGas {
  id: string;
  apartamento_id: string;
  apartamento_numero?: string | null;
  competencia: string;
  leitura_anterior: number | null;
  leitura_atual: number;
  consumo: number | null;
  valor_unitario: number | null;
  valor_cobrado: number | null;
  observacao?: string | null;
}

export function usePlanilhaGas(competencia?: string) {
  return useQuery({
    queryKey: [KEY, "planilha", competencia],
    queryFn: async () => {
      if (!competencia) return null;
      const res = await api.get<LeituraGasPlanilhaResponse>(`/gas/planilha?competencia=${competencia}`);
      return res.data;
    },
    enabled: !!competencia,
  });
}

export function useSalvarLoteGas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: LeituraGasSalvarLotePayload) => {
      const res = await api.post<LeituraGasPlanilhaResponse>("/gas/lote", payload);
      return res.data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, "planilha", vars.competencia] });
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["cobrancas"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteLeituraGas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/gas/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["cobrancas"] });
    },
  });
}
