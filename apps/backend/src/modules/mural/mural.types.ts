import { Papel, StatusPost, TipoPost } from '@prisma/client';

export { TipoPost, StatusPost };

export interface AutorDTO {
  id: string;
  nome: string;
  papel: Papel;
}

export interface ComentarioDTO {
  id: string;
  conteudo: string;
  createdAt: Date;
  autor: AutorDTO;
}

export interface PostDTO {
  id: string;
  conteudo: string;
  tipo: TipoPost;
  categoria: string | null;
  status: StatusPost | null;
  createdAt: Date;
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
  /** Só usado quando o autor é ADMIN (não tem condomínio próprio) — precisa escolher pra qual. */
  condominioId?: string;
}

export interface ResponderPostInput {
  conteudo: string;
}
