export interface Apartamento {
  id: string;
  numero: string;
  bloco: string | null;
  tipo: "padrao" | "area_privativa" | "cobertura";
  fracao_ideal: number | null;
  metragem: number | null;
  vaga_demarcada: string | null;
  status: "ocupado" | "vazio" | "alugado";
  created_at: string;
  updated_at: string;
}

export type ApartamentoCreate = Omit<
  Apartamento,
  "id" | "created_at" | "updated_at"
>;

export type ApartamentoUpdate = Partial<ApartamentoCreate>;
