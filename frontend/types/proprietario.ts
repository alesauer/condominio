export interface Proprietario {
  id: string;
  nome: string;
  cpf: string;
  telefone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProprietarioCreate {
  nome: string;
  cpf: string;
  telefone?: string | null;
  email?: string | null;
}

export type ProprietarioUpdate = Partial<ProprietarioCreate>;
