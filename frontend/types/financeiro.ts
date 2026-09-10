export type StatusFinanceiro = "pendente" | "pago" | "atrasado" | "cancelado";
export type TipoReceita = "condominio" | "fundo_reserva" | "taxa_extra";
export type TipoDespesa = "ordinaria" | "extraordinaria";

export interface Receita {
  id: string; descricao: string; tipo: TipoReceita; categoria: string | null;
  valor: number; competencia: string; vencimento: string | null;
  data_recebimento: string | null; status: StatusFinanceiro; observacao: string | null;
  comprovante_url?: string | null; comprovante_nome?: string | null;
  apartamento_id: string | null; created_at: string; updated_at: string;
}

export interface DespesaParcela {
  id: string; despesa_id: string; numero_parcela: number; valor: number;
  competencia: string; vencimento: string | null; status: StatusFinanceiro;
  created_at: string; updated_at: string;
}

export interface Despesa {
  id: string; descricao: string; tipo: TipoDespesa; categoria: string | null;
  valor: number; competencia: string; vencimento: string | null;
  data_pagamento: string | null; status: StatusFinanceiro; observacao: string | null;
  comprovante_url?: string | null; comprovante_nome?: string | null;
  parcelamento: boolean; total_parcelas: number | null; parcelas: DespesaParcela[];
  created_at: string; updated_at: string;
}

export interface Cobranca {
  id: string; apartamento_id: string; descricao: string; competencia: string;
  vencimento: string; valor: number; multa: number | null; juros: number | null;
  valor_total: number; data_pagamento: string | null; status: StatusFinanceiro;
  apartamento_numero?: string | null;
  apartamento_bloco?: string | null;
  created_at: string; updated_at: string;
}

export type ReceitaCreate = Omit<Receita, "id" | "created_at" | "updated_at"> & {
  recorrente?: boolean;
  meses_recorrencia?: number | null;
};
export type DespesaCreate = Omit<Despesa, "id" | "created_at" | "updated_at" | "parcelas" | "total_parcelas"> & {
  total_parcelas?: number | null;
  recorrente?: boolean;
  meses_recorrencia?: number | null;
};
export type ReceitaUpdate = Partial<ReceitaCreate>;
export type DespesaUpdate = Partial<Omit<DespesaCreate, "total_parcelas" | "parcelamento">>;

