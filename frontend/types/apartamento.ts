export interface Apartamento {
  id: string;
  numero: string;
  bloco: string | null;
  tipo: "padrao" | "area_privativa" | "cobertura";
  fracao_ideal: number | null;
  metragem: number | null;
  vaga_demarcada: string | null;
  status: "ocupado" | "vazio" | "alugado";
  proprietario_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApartamentoCreate {
  numero: string;
  bloco?: string | null;
  tipo: "padrao" | "area_privativa" | "cobertura";
  fracao_ideal?: number | null;
  metragem?: number | null;
  vaga_demarcada?: string | null;
  status?: "ocupado" | "vazio" | "alugado";
  proprietario_id?: string | null;
}

export type ApartamentoUpdate = Partial<ApartamentoCreate>;
