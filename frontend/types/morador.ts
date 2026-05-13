export interface Morador {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  veiculo: string | null;
  tipo: "morador" | "inquilino" | "dependente";
  created_at: string;
  updated_at: string;
}

export type MoradorCreate = Omit<
  Morador,
  "id" | "created_at" | "updated_at"
>;

export type MoradorUpdate = Partial<MoradorCreate>;
