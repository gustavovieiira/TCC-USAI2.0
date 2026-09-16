import { ComentarioPost, Post, PrismaClient, User } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '@/common/errors';
import {
  ComentarioDTO,
  CriarPostInput,
  PostComComentariosDTO,
  PostDTO,
  ResponderPostInput,
} from './mural.types';

type PostComAutor = Post & { autor: User };
type ComentarioComAutor = ComentarioPost & { autor: User };
type PostComTudo = Post & { autor: User; comentarios: ComentarioComAutor[] };

function toAutorDTO(autor: User) {
  return { id: autor.id, nome: autor.nome, papel: autor.papel };
}

function toPostDTO(post: PostComAutor, comentariosCount = 0): PostDTO {
  return {
    id: post.id,
    conteudo: post.conteudo,
    tipo: post.tipo,
    categoria: post.categoria,
    status: post.status,
    createdAt: post.createdAt,
    autor: toAutorDTO(post.autor),
    comentariosCount,
  };
}

function toComentarioDTO(comentario: ComentarioComAutor): ComentarioDTO {
  return {
    id: comentario.id,
    conteudo: comentario.conteudo,
    createdAt: comentario.createdAt,
    autor: toAutorDTO(comentario.autor),
  };
}

/**
 * Mural: feed único do condomínio, no espírito de uma rede social — qualquer morador, síndico ou
 * admin pode publicar (um pedido de ajuda com status, ou um aviso/post livre), e qualquer vizinho do
 * mesmo condomínio pode comentar publicamente. Sem numeração de RF própria — recurso adicionado
 * depois da RFC original, a partir do uso real da plataforma.
 */
export class MuralService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * `condominioIdDoAutor` vem do token de quem está logado; é `null` pro Admin USAI (não pertence a
   * um condomínio), caso em que `input.condominioId` é obrigatório.
   */
  async criarPost(
    condominioIdDoAutor: string | null,
    autorId: string,
    input: CriarPostInput,
  ): Promise<PostDTO> {
    const condominioId = await this.resolverCondominioId(condominioIdDoAutor, input.condominioId);

    const post = await this.prisma.post.create({
      data: {
        conteudo: input.conteudo,
        tipo: input.tipo,
        categoria: input.categoria,
        status: input.tipo === 'PEDIDO' ? 'ABERTO' : null,
        autorId,
        condominioId,
      },
      include: { autor: true },
    });

    return toPostDTO(post);
  }

  /** Escopado por condomínio, mesmo padrão do catálogo de itens. */
  async listarPorCondominio(condominioId: string): Promise<PostDTO[]> {
    const posts = await this.prisma.post.findMany({
      where: { condominioId },
      include: { autor: true, _count: { select: { comentarios: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return posts.map((post) => toPostDTO(post, post._count.comentarios));
  }

  async buscarPorId(postId: string, condominioId: string): Promise<PostComComentariosDTO> {
    const post = await this.buscarComComentariosOuFalhar(postId, condominioId);

    return {
      ...toPostDTO(post, post.comentarios.length),
      comentarios: post.comentarios.map(toComentarioDTO),
    };
  }

  /** Qualquer morador do condomínio pode comentar — é um mural público, não uma conversa privada. */
  async responder(
    postId: string,
    condominioId: string,
    autorId: string,
    input: ResponderPostInput,
  ): Promise<ComentarioDTO> {
    await this.buscarOuFalhar(postId, condominioId);

    const comentario = await this.prisma.comentarioPost.create({
      data: { postId, autorId, conteudo: input.conteudo },
      include: { autor: true },
    });

    return toComentarioDTO(comentario);
  }

  /** Só o autor do post pode marcá-lo como atendido, e só se for do tipo PEDIDO. */
  async marcarAtendido(postId: string, condominioId: string, autorId: string): Promise<PostDTO> {
    const post = await this.buscarOuFalhar(postId, condominioId);

    if (post.tipo !== 'PEDIDO') {
      throw new ForbiddenError('Apenas pedidos podem ser marcados como atendidos');
    }
    if (post.autorId !== autorId) {
      throw new ForbiddenError('Apenas quem fez o pedido pode marcá-lo como atendido');
    }

    const atualizado = await this.prisma.post.update({
      where: { id: postId },
      data: { status: 'ATENDIDO' },
      include: { autor: true, _count: { select: { comentarios: true } } },
    });

    return toPostDTO(atualizado, atualizado._count.comentarios);
  }

  /**
   * O próprio autor pode excluir o que postou; o síndico pode excluir qualquer post do próprio
   * condomínio (moderação).
   */
  async excluir(
    postId: string,
    condominioId: string,
    userId: string,
    papel: 'MORADOR' | 'SINDICO' | 'ADMIN',
  ): Promise<void> {
    const post = await this.buscarOuFalhar(postId, condominioId);

    const podeExcluir = post.autorId === userId || papel === 'SINDICO';
    if (!podeExcluir) {
      throw new ForbiddenError('Você não tem permissão para excluir este post');
    }

    await this.prisma.post.delete({ where: { id: postId } });
  }

  private async resolverCondominioId(
    condominioIdDoAutor: string | null,
    condominioIdInformado?: string,
  ): Promise<string> {
    if (condominioIdDoAutor) {
      return condominioIdDoAutor;
    }

    if (!condominioIdInformado) {
      throw new ForbiddenError('Informe o condomínio em que o post deve ser publicado');
    }

    const condominio = await this.prisma.condominio.findUnique({
      where: { id: condominioIdInformado },
    });
    if (!condominio) {
      throw new NotFoundError('Condomínio não encontrado');
    }

    return condominio.id;
  }

  private async buscarOuFalhar(postId: string, condominioId: string): Promise<PostComAutor> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, condominioId },
      include: { autor: true },
    });

    if (!post) {
      throw new NotFoundError('Post não encontrado');
    }

    return post;
  }

  private async buscarComComentariosOuFalhar(
    postId: string,
    condominioId: string,
  ): Promise<PostComTudo> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, condominioId },
      include: {
        autor: true,
        comentarios: { include: { autor: true }, orderBy: { createdAt: 'asc' } },
      },
    });

    if (!post) {
      throw new NotFoundError('Post não encontrado');
    }

    return post;
  }
}
