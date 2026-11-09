import { apiClient } from '@/lib/apiClient';
import {
  AssinaturasAdminDTO,
  CriarDespesaInput,
  DespesaDTO,
  VendasDoMesDTO,
} from './plataforma.types';

/** Entrou, saiu e resultado de um mês (AAAA-MM; sem o mês, o atual), com os recebimentos e as despesas. */
export async function buscarVendasDoMes(mes?: string): Promise<VendasDoMesDTO> {
  const { data } = await apiClient.get<VendasDoMesDTO>('/admin/plataforma/vendas', {
    params: mes ? { mes } : undefined,
  });
  return data;
}

export async function listarAssinaturasAdmin(): Promise<AssinaturasAdminDTO> {
  const { data } = await apiClient.get<AssinaturasAdminDTO>('/admin/plataforma/assinaturas');
  return data;
}

export async function criarDespesa(input: CriarDespesaInput): Promise<DespesaDTO> {
  const { data } = await apiClient.post<DespesaDTO>('/admin/plataforma/despesas', input);
  return data;
}

export async function removerDespesa(id: string): Promise<void> {
  await apiClient.delete(`/admin/plataforma/despesas/${id}`);
}
