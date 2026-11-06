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
  /** LGPD: aceite dos Termos de Uso e da Política de Privacidade. */
  aceiteTermos: boolean;
}

export interface LoginPayload {
  email: string;
  senha: string;
}

export interface AtualizarPerfilPayload {
  nome: string;
  apartamento?: string;
  cpf?: string;
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

/** Sair da conta: o servidor derruba as sessões abertas (o token de renovação deixa de valer). */
export async function encerrarSessao(): Promise<void> {
  await apiClient.post('/auth/logout');
}

/** "Esqueci minha senha": pede o e-mail com o link (a resposta é a mesma exista a conta ou não). */
export async function esqueciSenha(email: string): Promise<void> {
  await apiClient.post('/auth/esqueci-senha', { email });
}

/** Conclui o "Esqueci minha senha" com o link do e-mail; não faz login, a pessoa entra depois. */
export async function redefinirSenha(token: string, senha: string): Promise<void> {
  await apiClient.post('/auth/redefinir-senha', { token, senha });
}

/** Link do e-mail de acesso do síndico: define a primeira senha e já devolve a sessão. */
export async function definirSenha(token: string, senha: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/definir-senha', { token, senha });
  return data;
}
