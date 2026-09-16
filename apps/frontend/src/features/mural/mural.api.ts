import { apiClient } from '@/lib/apiClient';
import {
  ComentarioDTO,
  CriarPostInput,
  PostComComentariosDTO,
  PostDTO,
  ResponderPostInput,
} from './mural.types';

export async function listarPosts(): Promise<PostDTO[]> {
  const { data } = await apiClient.get<PostDTO[]>('/mural');
  return data;
}

export async function buscarPost(id: string): Promise<PostComComentariosDTO> {
  const { data } = await apiClient.get<PostComComentariosDTO>(`/mural/${id}`);
  return data;
}

export async function criarPost(input: CriarPostInput): Promise<PostDTO> {
  const { data } = await apiClient.post<PostDTO>('/mural', input);
  return data;
}

export async function responderPost(id: string, input: ResponderPostInput): Promise<ComentarioDTO> {
  const { data } = await apiClient.post<ComentarioDTO>(`/mural/${id}/respostas`, input);
  return data;
}

export async function marcarAtendido(id: string): Promise<PostDTO> {
  const { data } = await apiClient.post<PostDTO>(`/mural/${id}/atender`);
  return data;
}

export async function excluirPost(id: string): Promise<void> {
  await apiClient.delete(`/mural/${id}`);
}
