import { Item, ItemImagem, PrismaClient } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '@/common/errors';
import { AtualizarItemInput, CriarItemInput, ItemDTO, ListarItensFiltro } from './itens.types';

type ItemComImagens = Item & { imagens: ItemImagem[] };

function toItemDTO(item: ItemComImagens): ItemDTO {
  return {
    id: item.id,
    titulo: item.titulo,
    descricao: item.descricao,
    categoria: item.categoria,
    valorDiaria: Number(item.valorDiaria),
    ativo: item.ativo,
    ownerId: item.ownerId,
    condominioId: item.condominioId,
    imagens: item.imagens.map((imagem) => imagem.url),
    createdAt: item.createdAt,
  };
}

export class ItensService {
  constructor(private readonly prisma: PrismaClient) {}

  /** RF06 — publica um item para locação, vinculado ao condomínio do morador autenticado. */
  async criar(condominioId: string, ownerId: string, input: CriarItemInput): Promise<ItemDTO> {
    const item = await this.prisma.item.create({
      data: {
        titulo: input.titulo,
        descricao: input.descricao,
        categoria: input.categoria,
        valorDiaria: input.valorDiaria,
        ownerId,
        condominioId,
        imagens: input.imagens ? { create: input.imagens.map((url) => ({ url })) } : undefined,
      },
      include: { imagens: true },
    });

    return toItemDTO(item);
  }

  /** RF08 — catálogo de itens ativos do condomínio, opcionalmente filtrado por categoria (RN02). */
  async listarPorCondominio(
    condominioId: string,
    filtro: ListarItensFiltro = {},
  ): Promise<ItemDTO[]> {
    const itens = await this.prisma.item.findMany({
      where: {
        condominioId,
        ativo: true,
        ...(filtro.categoria ? { categoria: filtro.categoria } : {}),
      },
      include: { imagens: true },
      orderBy: { createdAt: 'desc' },
    });

    return itens.map(toItemDTO);
  }

  async buscarPorId(itemId: string, condominioId: string): Promise<ItemDTO> {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, condominioId },
      include: { imagens: true },
    });

    if (!item) {
      throw new NotFoundError('Item não encontrado');
    }

    return toItemDTO(item);
  }

  /** RF07 — apenas o proprietário do item pode editar seu anúncio. */
  async atualizar(itemId: string, ownerId: string, input: AtualizarItemInput): Promise<ItemDTO> {
    const existente = await this.prisma.item.findUnique({ where: { id: itemId } });

    if (!existente) {
      throw new NotFoundError('Item não encontrado');
    }

    if (existente.ownerId !== ownerId) {
      throw new ForbiddenError('Apenas o proprietário pode editar este item');
    }

    const item = await this.prisma.item.update({
      where: { id: itemId },
      data: input,
      include: { imagens: true },
    });

    return toItemDTO(item);
  }

  /** RF07 — remoção é lógica (ativo=false) para preservar o histórico de locações já realizadas. */
  async remover(itemId: string, ownerId: string): Promise<void> {
    const existente = await this.prisma.item.findUnique({ where: { id: itemId } });

    if (!existente) {
      throw new NotFoundError('Item não encontrado');
    }

    if (existente.ownerId !== ownerId) {
      throw new ForbiddenError('Apenas o proprietário pode remover este item');
    }

    await this.prisma.item.update({ where: { id: itemId }, data: { ativo: false } });
  }
}
