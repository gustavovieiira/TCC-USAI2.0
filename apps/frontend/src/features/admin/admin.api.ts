import { apiClient } from '@/lib/apiClient';
import {
  AtualizarCondominioInput,
  CondominioAdminDTO,
  CriarCondominioInput,
  CriarSindicoInput,
  ResumoFinanceiroDTO,
  SindicoDTO,
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
