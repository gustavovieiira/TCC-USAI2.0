import { apiClient } from '@/lib/apiClient';
import { CriarItemInput, ItemDTO, ListarItensFiltro } from './itens.types';

export async function listarItens(filtro: ListarItensFiltro = {}): Promise<ItemDTO[]> {
  const { data } = await apiClient.get<ItemDTO[]>('/itens', { params: filtro });
  return data;
}

export async function buscarItem(id: string): Promise<ItemDTO> {
  const { data } = await apiClient.get<ItemDTO>(`/itens/${id}`);
  return data;
}

export async function criarItem(input: CriarItemInput): Promise<ItemDTO> {
  const { data } = await apiClient.post<ItemDTO>('/itens', input);
  return data;
}

export async function uploadImagemItem(arquivo: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('imagem', arquivo);
  // Sem Content-Type manual: o axios/navegador define multipart/form-data com o boundary certo.
  const { data } = await apiClient.post<{ url: string }>('/itens/upload-imagem', formData);
  return data;
}
