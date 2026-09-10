export interface ApartamentoVinculoInfo {
  apartamento_id: string;
  numero: string;
  bloco?: string | null;
  tipo_vinculo: "proprietario" | "residente";
  data_inicio?: string | null;
  data_fim?: string | null;
}

export interface Morador {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  veiculo: string | null;
  tipo: "proprietario" | "inquilino" | "morador" | "dependente";
  apartamentos: ApartamentoVinculoInfo[];
  created_at: string;
  updated_at: string;
}

export interface MoradorCreate {
  nome: string;
  cpf?: string | null;
  telefone?: string | null;
  email?: string | null;
  veiculo?: string | null;
  tipo: "proprietario" | "inquilino" | "morador" | "dependente";
  apartamento_id?: string | null;
}

export type MoradorUpdate = Partial<MoradorCreate>;

export interface VincularApartamentoPayload {
  apartamento_id: string;
  tipo_vinculo?: "proprietario" | "residente";
  data_inicio?: string | null;
  data_fim?: string | null;
}
