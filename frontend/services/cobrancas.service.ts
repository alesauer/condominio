import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Cobranca } from "@/types/financeiro";
import type { PaginatedResponse } from "@/types";

const KEY = "cobrancas";

export interface AcaoEventoPayload {
  id?: string;
  titulo: string;
  descricao: string;
  data?: string | null;
}

export interface GerarCobrancasPayload {
  competencia: string;
  vencimento: string;
  valor_fundo_reserva?: number;
  valor_base_condominio?: number;
  incluir_despesas?: boolean;
  incluir_agua?: boolean;
  incluir_gas?: boolean;
  descricao?: string;
  acoes_eventos?: AcaoEventoPayload[];
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
  valor_fundo_reserva?: number;
  valor_base?: number;
  valor_total: number;
  ja_gerado: boolean;
}

export interface CobrancaPreviaResult {
  competencia: string;
  vencimento: string;
  total_despesas_mes: number;
  total_agua: number;
  total_gas: number;
  total_fundo_reserva?: number;
  total_base?: number;
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

export interface DemonstrativoApartamentoHeader {
  id: string;
  numero: string;
  bloco: string | null;
  fracao_ideal: number;
  responsavel_nome: string;
}

export interface DemonstrativoDespesaItem {
  id?: string;
  descricao: string;
  observacao: string;
  valor: number;
  rateio_por_apto: Record<string, number>;
}

export interface DemonstrativoFundoReserva {
  descricao: string;
  valor_unitario: number;
  valor_total: number;
  rateio_por_apto: Record<string, number>;
}

export interface DemonstrativoCobrancaApto {
  apartamento_id: string;
  apartamento_numero: string;
  responsavel_nome: string;
  valor_a_pagar: number;
  vencimento: string;
  status: string;
  data_pagamento?: string | null;
  confirmacao_pgto?: string;
}

export interface DemonstrativoAcaoEvento {
  id?: string;
  titulo: string;
  descricao: string;
  data?: string | null;
}

export interface DemonstrativoFracaoAgua {
  descricao: string;
  fracao: number;
  percentual_formatado: string;
}

export interface DemonstrativoTrocaGas {
  ultima_troca?: string;
  previsao_proxima_troca?: string;
  observacao?: string;
}

export interface DemonstrativoLeituraGasItem {
  apartamento_numero: string;
  leitura_anterior: number;
  leitura_atual: number;
  m3_usado: number;
  valor_a_pagar: number;
}

export interface DemonstrativoGas {
  preco_m3: number;
  leituras: DemonstrativoLeituraGasItem[];
  total_m3: number;
  total_valor: number;
  troca_gas: DemonstrativoTrocaGas;
}

export interface DemonstrativoMensalResponse {
  competencia: string;
  competencia_formatada: string;
  vencimento_padrao?: string | null;
  apartamentos_header: DemonstrativoApartamentoHeader[];
  despesas_itens: DemonstrativoDespesaItem[];
  total_despesas_mes: number;
  total_despesas_por_apto: Record<string, number>;
  fundo_reserva: DemonstrativoFundoReserva;
  cobrancas_moradores: DemonstrativoCobrancaApto[];
  total_cobrancas_mes: number;
  acoes_eventos: DemonstrativoAcaoEvento[];
  fracoes_agua: DemonstrativoFracaoAgua[];
  gas: DemonstrativoGas;
}

export function useDemonstrativoMensal(competencia: string) {
  return useQuery({
    queryKey: [KEY, "demonstrativo-mensal", competencia],
    queryFn: () =>
      api
        .get<DemonstrativoMensalResponse>("/cobrancas/demonstrativo-mensal", {
          params: { competencia },
        })
        .then((r) => r.data),
    enabled: !!competencia,
  });
}

export function useSalvarAcoesEventos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { competencia: string; acoes_eventos: AcaoEventoPayload[] }) =>
      api.post<DemonstrativoAcaoEvento[]>("/cobrancas/acoes-eventos", data).then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, "demonstrativo-mensal", vars.competencia] });
    },
  });
}

export function useDeleteAcaoEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, competencia }: { id: string; competencia: string }) =>
      api.delete(`/cobrancas/acoes-eventos/${id}`),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, "demonstrativo-mensal", vars.competencia] });
    },
  });
}

export interface SalvarTrocaGasPayload {
  competencia?: string;
  ultima_troca?: string;
  previsao_proxima_troca?: string;
  observacao?: string;
}

export function useSalvarTrocaGas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SalvarTrocaGasPayload) =>
      api.post<DemonstrativoTrocaGas>("/cobrancas/troca-gas", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, "demonstrativo-mensal"] });
    },
  });
}


