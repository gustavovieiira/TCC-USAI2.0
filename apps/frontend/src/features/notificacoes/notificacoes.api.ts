import { apiClient } from '@/lib/apiClient';
import { ListaNotificacoesDTO } from './notificacoes.types';

export async function listarNotificacoes(): Promise<ListaNotificacoesDTO> {
  const { data } = await apiClient.get<ListaNotificacoesDTO>('/notificacoes');
  return data;
}

export async function marcarNotificacaoComoLida(id: string): Promise<void> {
  await apiClient.post(`/notificacoes/${id}/lida`);
}

export async function marcarTodasNotificacoesComoLidas(): Promise<void> {
  await apiClient.post('/notificacoes/ler-todas');
}
