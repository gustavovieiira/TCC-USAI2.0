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
