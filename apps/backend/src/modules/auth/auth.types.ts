import { Papel } from '@prisma/client';

export interface CadastroMoradorInput {
  linkSlug: string;
  pin: string;
  nome: string;
  email: string;
  senha: string;
  apartamento?: string;
}

export interface LoginInput {
  email: string;
  senha: string;
}

export interface AtualizarPerfilInput {
  nome: string;
  apartamento?: string;
  /** CPF (só dígitos após normalização) — necessário pro locatário pagar uma locação via Asaas (M3). */
  cpf?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedUser {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  condominioId: string | null;
  apartamento: string | null;
  cpf: string | null;
}

export interface AuthResult extends AuthTokens {
  user: AuthenticatedUser;
}
