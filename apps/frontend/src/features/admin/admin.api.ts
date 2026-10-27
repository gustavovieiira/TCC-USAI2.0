import { apiClient } from '@/lib/apiClient';
import {
  AtualizarCondominioInput,
  CondominioAdminDTO,
  CriarCondominioInput,
  CriarSindicoInput,
  ExtratoDeUsuarioDTO,
  ExtratoPlataformaDTO,
  ResumoFinanceiroDTO,
  SindicoDTO,
  UsuarioAdminDTO,
} from './admin.types';

export async function criarCondominio(input: CriarCondominioInput): Promise<CondominioAdminDTO> {
  const { data } = await apiClient.post<CondominioAdminDTO>('/admin/condominios', input);
  return data;
}

export async function listarCondominios(): Promise<CondominioAdminDTO[]> {
  const { data } = await apiClient.get<CondominioAdminDTO[]>('/admin/condominios');
  return data;
}

export async function atualizarCondominio(
  id: string,
  input: AtualizarCondominioInput,
): Promise<CondominioAdminDTO> {
  const { data } = await apiClient.patch<CondominioAdminDTO>(`/admin/condominios/${id}`, input);
  return data;
}

export async function criarSindico(input: CriarSindicoInput): Promise<SindicoDTO> {
  const { data } = await apiClient.post<SindicoDTO>('/admin/sindicos', input);
  return data;
}

export async function resumoFinanceiro(): Promise<ResumoFinanceiroDTO> {
  const { data } = await apiClient.get<ResumoFinanceiroDTO>('/admin/financeiro/resumo');
  return data;
}

/** Busca de usuários (nome ou e-mail) pra abrir o extrato de qualquer um. */
export async function listarUsuarios(busca?: string): Promise<UsuarioAdminDTO[]> {
  const { data } = await apiClient.get<UsuarioAdminDTO[]>('/admin/usuarios', {
    params: busca ? { busca } : undefined,
  });
  return data;
}

/** Extrato completo de qualquer usuário (auditoria/suporte). */
export async function extratoDoUsuario(id: string): Promise<ExtratoDeUsuarioDTO> {
  const { data } = await apiClient.get<ExtratoDeUsuarioDTO>(`/admin/usuarios/${id}/extrato`);
  return data;
}

/** Conta da USAI: o que ficou com a plataforma, linha a linha. */
export async function extratoPlataforma(): Promise<ExtratoPlataformaDTO> {
  const { data } = await apiClient.get<ExtratoPlataformaDTO>('/admin/plataforma/extrato');
  return data;
}
