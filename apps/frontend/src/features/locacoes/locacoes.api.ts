import { apiClient } from '@/lib/apiClient';
import { CriarLocacaoInput, LocacaoDTO } from './locacoes.types';

export async function solicitarLocacao(input: CriarLocacaoInput): Promise<LocacaoDTO> {
  const { data } = await apiClient.post<LocacaoDTO>('/locacoes', input);
  return data;
}

export async function listarComoLocatario(): Promise<LocacaoDTO[]> {
  const { data } = await apiClient.get<LocacaoDTO[]>('/locacoes/minhas');
  return data;
}

export async function listarComoProprietario(): Promise<LocacaoDTO[]> {
  const { data } = await apiClient.get<LocacaoDTO[]>('/locacoes/recebidas');
  return data;
}

export async function aprovarLocacao(id: string): Promise<LocacaoDTO> {
  const { data } = await apiClient.post<LocacaoDTO>(`/locacoes/${id}/aprovar`);
  return data;
}

export async function rejeitarLocacao(id: string): Promise<LocacaoDTO> {
  const { data } = await apiClient.post<LocacaoDTO>(`/locacoes/${id}/rejeitar`);
  return data;
}
