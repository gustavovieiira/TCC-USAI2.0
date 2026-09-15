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
}

export interface AuthResult extends AuthTokens {
  user: AuthenticatedUser;
}
