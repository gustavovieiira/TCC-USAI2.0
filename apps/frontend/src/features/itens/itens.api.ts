import { apiClient } from '@/lib/apiClient';

export interface Item {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  valorDiaria: number;
  ativo: boolean;
  ownerId: string;
  condominioId: string;
  imagens: string[];
  createdAt: string;
}

export interface CriarItemPayload {
  titulo: string;
  descricao: string;
  categoria: string;
  valorDiaria: number;
  imagens?: string[];
}

export async function listarItens(categoria?: string): Promise<Item[]> {
  const { data } = await apiClient.get<Item[]>('/itens', {
    params: categoria ? { categoria } : {},
  });
  return data;
}

export async function criarItem(payload: CriarItemPayload): Promise<Item> {
  const { data } = await apiClient.post<Item>('/itens', payload);
  return data;
}

export async function removerItem(itemId: string): Promise<void> {
  await apiClient.delete(`/itens/${itemId}`);
}
