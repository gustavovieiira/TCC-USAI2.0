import { apiClient } from '@/lib/apiClient';
import { StoredUser } from '@/lib/authStorage';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
}

export interface CadastroMoradorPayload {
  linkSlug: string;
  pin: string;
  nome: string;
  email: string;
  senha: string;
  apartamento?: string;
}

export interface LoginPayload {
  email: string;
  senha: string;
}

export interface AtualizarPerfilPayload {
  nome: string;
  apartamento?: string;
}

export async function cadastrarMorador(payload: CadastroMoradorPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/cadastro', payload);
  return data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
  return data;
}

export async function atualizarPerfil(payload: AtualizarPerfilPayload): Promise<StoredUser> {
  const { data } = await apiClient.patch<StoredUser>('/auth/perfil', payload);
  return data;
}
