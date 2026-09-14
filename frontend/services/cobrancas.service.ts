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
  separar_fundo_proprietario?: boolean;
  sobrescrever?: boolean;
  regerar?: boolean;
  descricao?: string;
  acoes_eventos?: AcaoEventoPayload[];
}

export interface CobrancaPreviaApartamento {
  apartamento_id: string;
  apartamento_numero: string;
  apartamento_bloco: string | null;
  apartamento_tipo: string | null;
  status?: string;
  is_alugado?: boolean;
  proprietario_nome?: string | null;
  proprietario_email?: string | null;
  responsavel_nome?: string | null;
  responsavel_email?: string | null;
  fracao_ideal: number;
  valor_despesas: number;
  valor_agua: number;
  valor_gas: number;
  valor_fundo_reserva?: number;
  valor_base?: number;
  cota_inquilino?: number;
  cota_proprietario?: number;
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
  total_ja_gerados?: number;
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

export function useDeleteCobranca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/cobrancas/${id}`),
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
          total_fundo_reserva?: number;
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
  bloco?: string | null;
  fracao_ideal: number;
  status?: string;
  is_alugado?: boolean;
  proprietario_nome?: string | null;
  proprietario_email?: string | null;
  responsavel_nome: string;
  responsavel_email?: string | null;
}

export interface DemonstrativoDespesaItem {
  id?: string;
  descricao: string;
  observacao?: string;
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
  bloco?: string | null;
  status_apartamento?: string;
  is_alugado?: boolean;
  proprietario_nome?: string | null;
  proprietario_email?: string | null;
  responsavel_nome: string;
  responsavel_email?: string | null;
  cota_inquilino?: number;
  cota_proprietario?: number;
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
  mensagem_vencimento?: string | null;
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

export interface SalvarMensagemVencimentoPayload {
  competencia?: string;
  mensagem_vencimento: string;
}

export function useSalvarMensagemVencimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SalvarMensagemVencimentoPayload) =>
      api.post<{ competencia?: string; mensagem_vencimento: string }>("/cobrancas/mensagem-vencimento", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, "demonstrativo-mensal"] });
    },
  });
}

export interface DestinatarioEmailItem {
  apartamento_numero: string;
  nome?: string;
  email: string;
}

export interface EnviarDemonstrativoEmailPayload {
  competencia: string;
  destinatarios?: DestinatarioEmailItem[];
  assunto?: string;
  mensagem_personalizada?: string;
  pdf_base64?: string;
}

export interface EnvioEmailStatusItem {
  apartamento_numero: string;
  nome?: string;
  email?: string;
  status: string;
  erro?: string | null;
}

export interface EnviarDemonstrativoEmailResult {
  sucesso: boolean;
  competencia: string;
  competencia_formatada: string;
  total_enviados: number;
  total_falhas: number;
  destinatarios: EnvioEmailStatusItem[];
}

export function useEnviarDemonstrativoEmail() {
  return useMutation({
    mutationFn: (data: EnviarDemonstrativoEmailPayload) =>
      api.post<EnviarDemonstrativoEmailResult>("/cobrancas/enviar-email-demonstrativo", data).then((r) => r.data),
  });
}



