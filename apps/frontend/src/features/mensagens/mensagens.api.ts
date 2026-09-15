import { apiClient } from '@/lib/apiClient';
import { MensagemDTO } from './mensagens.types';

export async function listarMensagens(locacaoId: string): Promise<MensagemDTO[]> {
  const { data } = await apiClient.get<MensagemDTO[]>(`/locacoes/${locacaoId}/mensagens`);
  return data;
}
