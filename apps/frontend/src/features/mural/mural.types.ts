import { Papel } from '@/lib/authStorage';

export type StatusPost = 'ABERTO' | 'ATENDIDO';
export type TipoPost = 'PEDIDO' | 'AVISO';

export interface AutorDTO {
  id: string;
  nome: string;
  papel: Papel;
}

export interface ComentarioDTO {
  id: string;
  conteudo: string;
  createdAt: string;
  autor: AutorDTO;
}

export interface PostDTO {
  id: string;
  conteudo: string;
  tipo: TipoPost;
  categoria: string | null;
  status: StatusPost | null;
  createdAt: string;
  autor: AutorDTO;
  comentariosCount: number;
}

export interface PostComComentariosDTO extends PostDTO {
  comentarios: ComentarioDTO[];
}

export interface CriarPostInput {
  conteudo: string;
  tipo: TipoPost;
  categoria?: string;
  condominioId?: string;
}

export interface ResponderPostInput {
  conteudo: string;
}
