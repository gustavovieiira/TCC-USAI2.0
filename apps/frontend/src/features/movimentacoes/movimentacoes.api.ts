import { apiClient } from '@/lib/apiClient';
import {
  AceitarMovimentacaoInput,
  CriarTermoInput,
  MovimentacaoDetalheDTO,
  MovimentacaoResumoDTO,
  RegistrarMovimentacaoInput,
  TermoDTO,
  TipoMovimentacao,
} from './movimentacoes.types';

export async function listarMovimentacoesDaLocacao(
  locacaoId: string,
): Promise<MovimentacaoResumoDTO[]> {
  const { data } = await apiClient.get<MovimentacaoResumoDTO[]>(
    `/locacoes/${locacaoId}/movimentacoes`,
  );
  return data;
}

export async function registrarMovimentacao(
  locacaoId: string,
  input: RegistrarMovimentacaoInput,
): Promise<MovimentacaoResumoDTO> {
  const { data } = await apiClient.post<MovimentacaoResumoDTO>(
    `/locacoes/${locacaoId}/movimentacoes`,
    input,
  );
  return data;
}

export async function buscarMovimentacao(id: string): Promise<MovimentacaoDetalheDTO> {
  const { data } = await apiClient.get<MovimentacaoDetalheDTO>(`/movimentacoes/${id}`);
  return data;
}

export async function buscarTermoVigente(tipo: TipoMovimentacao): Promise<TermoDTO> {
  const { data } = await apiClient.get<TermoDTO>(`/movimentacoes/termos/${tipo.toLowerCase()}`);
  return data;
}

export async function aceitarMovimentacao(
  id: string,
  input: AceitarMovimentacaoInput,
): Promise<MovimentacaoDetalheDTO> {
  const { data } = await apiClient.post<MovimentacaoDetalheDTO>(
    `/movimentacoes/${id}/aceite`,
    input,
  );
  return data;
}

export async function cancelarMovimentacao(id: string): Promise<MovimentacaoDetalheDTO> {
  const { data } = await apiClient.post<MovimentacaoDetalheDTO>(`/movimentacoes/${id}/cancelar`);
  return data;
}

export async function retificarMovimentacao(
  id: string,
  texto: string,
): Promise<MovimentacaoDetalheDTO> {
  const { data } = await apiClient.post<MovimentacaoDetalheDTO>(
    `/movimentacoes/${id}/retificacoes`,
    {
      texto,
    },
  );
  return data;
}

/** Admin: termos versionados e auditoria dos documentos. */
export async function listarTermos(): Promise<TermoDTO[]> {
  const { data } = await apiClient.get<TermoDTO[]>('/admin/termos');
  return data;
}

export async function criarVersaoDoTermo(input: CriarTermoInput): Promise<TermoDTO> {
  const { data } = await apiClient.post<TermoDTO>('/admin/termos', input);
  return data;
}

export async function aprovarTermo(id: string): Promise<TermoDTO> {
  const { data } = await apiClient.post<TermoDTO>(`/admin/termos/${id}/aprovar`);
  return data;
}

export async function listarDocumentosRecentes(): Promise<MovimentacaoResumoDTO[]> {
  const { data } = await apiClient.get<MovimentacaoResumoDTO[]>('/admin/movimentacoes');
  return data;
}
