import { apiClient } from '@/lib/apiClient';
import { SaqueDTO, SolicitarSaqueInput, StatusSaque } from './saques.types';

export async function solicitarSaque(input: SolicitarSaqueInput): Promise<SaqueDTO> {
  const { data } = await apiClient.post<SaqueDTO>('/saques', input);
  return data;
}

export async function listarMeusSaques(): Promise<SaqueDTO[]> {
  const { data } = await apiClient.get<SaqueDTO[]>('/saques/minhas');
  return data;
}

/** Admin USAI. */
export async function listarTodosSaques(status?: StatusSaque): Promise<SaqueDTO[]> {
  const { data } = await apiClient.get<SaqueDTO[]>('/saques', {
    params: status ? { status } : undefined,
  });
  return data;
}

export async function aprovarSaque(id: string): Promise<SaqueDTO> {
  const { data } = await apiClient.post<SaqueDTO>(`/saques/${id}/aprovar`);
  return data;
}

export async function rejeitarSaque(id: string, motivoRejeicao: string): Promise<SaqueDTO> {
  const { data } = await apiClient.post<SaqueDTO>(`/saques/${id}/rejeitar`, { motivoRejeicao });
  return data;
}
