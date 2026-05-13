export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: string;
  nome: string;
  email: string;
  role: "admin" | "morador" | "proprietario";
}
