import { apiClient } from '@/lib/apiClient';
import { CondominioDTO, LocacaoAtivaDTO, MoradorDTO } from './sindico.types';

export async function buscarCondominio(): Promise<CondominioDTO> {
  const { data } = await apiClient.get<CondominioDTO>('/sindico/condominio');
  return data;
}

export async function atualizarPin(pin: string): Promise<CondominioDTO> {
  const { data } = await apiClient.patch<CondominioDTO>('/sindico/condominio/pin', { pin });
  return data;
}

export async function listarMoradores(): Promise<MoradorDTO[]> {
  const { data } = await apiClient.get<MoradorDTO[]>('/sindico/moradores');
  return data;
}

export async function listarLocacoesAtivas(): Promise<LocacaoAtivaDTO[]> {
  const { data } = await apiClient.get<LocacaoAtivaDTO[]>('/sindico/locacoes');
  return data;
}
