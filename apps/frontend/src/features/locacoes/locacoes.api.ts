import { apiClient } from '@/lib/apiClient';

export type StatusLocacao =
  'PENDENTE' | 'APROVADA' | 'PAGA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';

export interface Locacao {
  id: string;
  itemId: string;
  locatarioId: string;
  dataInicio: string;
  dataFim: string;
  valorTotal: number;
  status: StatusLocacao;
  createdAt: string;
  item: {
    id: string;
    titulo: string;
    valorDiaria: number;
    ownerId: string;
  };
}

export interface SolicitarLocacaoPayload {
  itemId: string;
  dataInicio: string;
  dataFim: string;
}

export async function solicitarLocacao(payload: SolicitarLocacaoPayload): Promise<Locacao> {
  const { data } = await apiClient.post<Locacao>('/locacoes', payload);
  return data;
}

export async function listarMinhasLocacoes(): Promise<Locacao[]> {
  const { data } = await apiClient.get<Locacao[]>('/locacoes/minhas');
  return data;
}

export async function listarLocacoesRecebidas(): Promise<Locacao[]> {
  const { data } = await apiClient.get<Locacao[]>('/locacoes/recebidas');
  return data;
}

export async function aprovarLocacao(id: string): Promise<Locacao> {
  const { data } = await apiClient.post<Locacao>(`/locacoes/${id}/aprovar`);
  return data;
}

export async function rejeitarLocacao(id: string): Promise<Locacao> {
  const { data } = await apiClient.post<Locacao>(`/locacoes/${id}/rejeitar`);
  return data;
}
