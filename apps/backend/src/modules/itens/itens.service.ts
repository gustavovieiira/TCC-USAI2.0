import { Item, ItemImagem, PrismaClient } from '@prisma/client';
import { AppError, ForbiddenError, NotFoundError } from '@/common/errors';
import { MENSAGEM_VALOR_MINIMO, VALOR_MINIMO_COBRANCA } from '@/common/valores';
import { AtualizarItemInput, CriarItemInput, ItemDTO, ListarItensFiltro } from './itens.types';

type ItemComImagens = Item & {
  imagens: ItemImagem[];
  owner?: { nome: string; apartamento: string | null } | null;
};

const COM_IMAGENS_E_DONO = {
  imagens: true,
  owner: { select: { nome: true, apartamento: true } },
} as const;

/** `acessorios` é JSON no banco; só passa adiante o que for lista de textos. */
export function lerAcessorios(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((a): a is string => typeof a === 'string') : [];
}

function toItemDTO(item: ItemComImagens): ItemDTO {
  return {
    id: item.id,
    titulo: item.titulo,
    descricao: item.descricao,
    categoria: item.categoria,
    valorDiaria: Number(item.valorDiaria),
    tipo: item.tipo,
    unidadeCobranca: item.unidadeCobranca,
    proprietario: item.owner
      ? { nome: item.owner.nome, apartamento: item.owner.apartamento }
      : null,
    fabricante: item.fabricante,
    modelo: item.modelo,
    numeroSerie: item.numeroSerie,
    acessorios: lerAcessorios(item.acessorios),
    ativo: item.ativo,
    ownerId: item.ownerId,
    condominioId: item.condominioId,
    imagens: item.imagens.map((imagem) => imagem.url),
    createdAt: item.createdAt,
  };
}

export class ItensService {
  constructor(private readonly prisma: PrismaClient) {}

  /** RF06, publica um item para locação, vinculado ao condomínio do morador autenticado. */
  async criar(condominioId: string, ownerId: string, input: CriarItemInput): Promise<ItemDTO> {
    const item = await this.prisma.item.create({
      data: {
        titulo: input.titulo,
        descricao: input.descricao,
        categoria: input.categoria,
        valorDiaria: input.valorDiaria,
        tipo: input.tipo ?? 'ITEM',
        unidadeCobranca: input.unidadeCobranca ?? 'DIA',
        fabricante: input.fabricante,
        modelo: input.modelo,
        numeroSerie: input.numeroSerie,
        acessorios: input.acessorios,
        ownerId,
        condominioId,
        imagens: input.imagens ? { create: input.imagens.map((url) => ({ url })) } : undefined,
      },
      include: COM_IMAGENS_E_DONO,
    });

    return toItemDTO(item);
  }

  /** RF08, catálogo de itens ativos do condomínio, opcionalmente filtrado por categoria (RN02). */
  async listarPorCondominio(
    condominioId: string,
    filtro: ListarItensFiltro = {},
  ): Promise<ItemDTO[]> {
    const itens = await this.prisma.item.findMany({
      where: {
        condominioId,
        ativo: true,
        ...(filtro.categoria ? { categoria: filtro.categoria } : {}),
        ...(filtro.tipo ? { tipo: filtro.tipo } : {}),
      },
      include: COM_IMAGENS_E_DONO,
      orderBy: { createdAt: 'desc' },
    });

    return itens.map(toItemDTO);
  }

  async buscarPorId(itemId: string, condominioId: string): Promise<ItemDTO> {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, condominioId },
      include: COM_IMAGENS_E_DONO,
    });

    if (!item) {
      throw new NotFoundError('Item não encontrado');
    }

    return toItemDTO(item);
  }

  /** RF07, apenas o proprietário do item pode editar seu anúncio. */
  async atualizar(itemId: string, ownerId: string, input: AtualizarItemInput): Promise<ItemDTO> {
    const existente = await this.prisma.item.findUnique({ where: { id: itemId } });

    if (!existente) {
      throw new NotFoundError('Item não encontrado');
    }

    if (existente.ownerId !== ownerId) {
      throw new ForbiddenError('Apenas o proprietário pode editar este item');
    }

    // O piso de R$ 5,00 (o menor valor que o PIX aceita) vale só para item alugado pela plataforma.
    if (
      input.valorDiaria !== undefined &&
      existente.tipo !== 'SERVICO' &&
      input.valorDiaria < VALOR_MINIMO_COBRANCA
    ) {
      throw new AppError(MENSAGEM_VALOR_MINIMO, 400, 'VALOR_MINIMO');
    }
    if (input.unidadeCobranca !== undefined) {
      const valida =
        existente.tipo !== 'SERVICO'
          ? input.unidadeCobranca === 'DIA'
          : input.unidadeCobranca === 'HORA' || input.unidadeCobranca === 'SERVICO';
      if (!valida) {
        throw new AppError(
          existente.tipo !== 'SERVICO'
            ? 'Um item é cobrado por dia'
            : 'Um serviço é cobrado por hora ou por serviço',
          400,
          'UNIDADE_INVALIDA',
        );
      }
    }

    const dados =
      existente.tipo === 'SERVICO'
        ? {
            ...input,
            fabricante: undefined,
            modelo: undefined,
            numeroSerie: undefined,
            acessorios: undefined,
          }
        : input;

    const item = await this.prisma.item.update({
      where: { id: itemId },
      data: dados,
      include: COM_IMAGENS_E_DONO,
    });

    return toItemDTO(item);
  }

  /** RF07, remoção é lógica (ativo=false) para preservar o histórico de locações já realizadas. */
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
