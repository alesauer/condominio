export interface Proprietario {
  id: string;
  nome: string;
  cpf: string;
  telefone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export type ProprietarioCreate = Omit<
  Proprietario,
  "id" | "created_at" | "updated_at"
>;

export type ProprietarioUpdate = Partial<ProprietarioCreate>;
