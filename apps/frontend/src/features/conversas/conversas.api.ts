import { apiClient } from '@/lib/apiClient';
import {
  AbrirConversaInput,
  ConversaDTO,
  MensagemPrivadaDTO,
  ParticipanteDTO,
} from './conversas.types';

export async function abrirConversa(input: AbrirConversaInput): Promise<ConversaDTO> {
  const { data } = await apiClient.post<ConversaDTO>('/conversas', input);
  return data;
}

/** Abre (criando na primeira vez) o chat de uma locação — só locatário e dono. */
export async function abrirConversaDaLocacao(locacaoId: string): Promise<ConversaDTO> {
  const { data } = await apiClient.post<ConversaDTO>(`/conversas/locacao/${locacaoId}`);
  return data;
}

/** Total de mensagens não lidas em todas as conversas (bolinha do menu). */
export async function contarMensagensNaoLidas(): Promise<number> {
  const { data } = await apiClient.get<{ total: number }>('/conversas/nao-lidas');
  return data.total;
}

/** Avisa o resto do app (ex.: a bolinha do menu) que a contagem de não lidas mudou. */
export const EVENTO_CONVERSAS_LIDAS = 'conversas:lidas';

export async function marcarConversaComoLida(id: string): Promise<void> {
  await apiClient.post(`/conversas/${id}/lida`);
  window.dispatchEvent(new Event(EVENTO_CONVERSAS_LIDAS));
}

/** Todo mundo do condomínio (exceto quem está buscando) — pra achar com quem começar uma conversa. */
export async function listarUsuariosDoCondominio(): Promise<ParticipanteDTO[]> {
  const { data } = await apiClient.get<ParticipanteDTO[]>('/conversas/usuarios');
  return data;
}

export async function listarMinhasConversas(): Promise<ConversaDTO[]> {
  const { data } = await apiClient.get<ConversaDTO[]>('/conversas');
  return data;
}

export async function buscarConversa(id: string): Promise<ConversaDTO> {
  const { data } = await apiClient.get<ConversaDTO>(`/conversas/${id}`);
  return data;
}

export async function listarMensagens(id: string): Promise<MensagemPrivadaDTO[]> {
  const { data } = await apiClient.get<MensagemPrivadaDTO[]>(`/conversas/${id}/mensagens`);
  return data;
}
