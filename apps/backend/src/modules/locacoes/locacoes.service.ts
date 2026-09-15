import { Item, Locacao, PrismaClient, StatusLocacao } from '@prisma/client';
import { AppError, ForbiddenError, NotFoundError } from '@/common/errors';
import { CriarLocacaoInput, LocacaoDTO } from './locacoes.types';

const MS_POR_DIA = 1000 * 60 * 60 * 24;

/**
 * Status que efetivamente reservam o item no período (bloqueiam sobreposição) — também usado pelo
 * painel do síndico (`sindico.service.ts`) como definição de "locação ativa".
 */
export const STATUS_QUE_OCUPAM_PERIODO: StatusLocacao[] = [
  'PENDENTE',
  'APROVADA',
  'PAGA',
  'EM_ANDAMENTO',
];

type LocacaoComItem = Locacao & { item: Item };

function toLocacaoDTO(locacao: LocacaoComItem): LocacaoDTO {
  return {
    id: locacao.id,
    itemId: locacao.itemId,
    locatarioId: locacao.locatarioId,
    dataInicio: locacao.dataInicio,
    dataFim: locacao.dataFim,
    valorTotal: Number(locacao.valorTotal),
    status: locacao.status,
    createdAt: locacao.createdAt,
    item: {
      id: locacao.item.id,
      titulo: locacao.item.titulo,
      valorDiaria: Number(locacao.item.valorDiaria),
      ownerId: locacao.item.ownerId,
    },
  };
}

function calcularDias(dataInicio: Date, dataFim: Date): number {
  return Math.max(1, Math.ceil((dataFim.getTime() - dataInicio.getTime()) / MS_POR_DIA));
}

export class LocacoesService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * RF10/RF11 — solicita a locação de um item por um período, calculando o valor automaticamente.
   * RN04 — o próprio dono do item não pode solicitar a locação dele.
   */
  async solicitar(
    condominioId: string,
    locatarioId: string,
    input: CriarLocacaoInput,
  ): Promise<LocacaoDTO> {
    const item = await this.prisma.item.findFirst({
      where: { id: input.itemId, condominioId, ativo: true },
    });

    if (!item) {
      throw new NotFoundError('Item não encontrado ou indisponível');
    }

    if (item.ownerId === locatarioId) {
      throw new AppError('Não é possível solicitar a locação do próprio item', 400, 'SELF_RENTAL');
    }

    const conflito = await this.prisma.locacao.findFirst({
      where: {
        itemId: item.id,
        status: { in: STATUS_QUE_OCUPAM_PERIODO },
        dataInicio: { lt: input.dataFim },
        dataFim: { gt: input.dataInicio },
      },
    });

    if (conflito) {
      throw new AppError('Item indisponível no período solicitado', 409, 'PERIOD_UNAVAILABLE');
    }

    const dias = calcularDias(input.dataInicio, input.dataFim);
    const valorTotal = Number(item.valorDiaria) * dias;

    const locacao = await this.prisma.locacao.create({
      data: {
        itemId: item.id,
        locatarioId,
        dataInicio: input.dataInicio,
        dataFim: input.dataFim,
        valorTotal,
        status: 'PENDENTE',
      },
      include: { item: true },
    });

    return toLocacaoDTO(locacao);
  }

  /** RF12 — apenas o proprietário do item pode aprovar a solicitação. */
  async aprovar(locacaoId: string, ownerId: string): Promise<LocacaoDTO> {
    const locacao = await this.buscarComItemOuFalhar(locacaoId);

    if (locacao.item.ownerId !== ownerId) {
      throw new ForbiddenError('Apenas o proprietário do item pode aprovar esta locação');
    }

    if (locacao.status !== 'PENDENTE') {
      throw new AppError('Somente locações pendentes podem ser aprovadas', 409, 'INVALID_STATUS');
    }

    const atualizada = await this.prisma.locacao.update({
      where: { id: locacaoId },
      data: { status: 'APROVADA' },
      include: { item: true },
    });

    return toLocacaoDTO(atualizada);
  }

  /** RF12 — o proprietário também pode rejeitar; a locação vai para CANCELADA. */
  async rejeitar(locacaoId: string, ownerId: string): Promise<LocacaoDTO> {
    const locacao = await this.buscarComItemOuFalhar(locacaoId);

    if (locacao.item.ownerId !== ownerId) {
      throw new ForbiddenError('Apenas o proprietário do item pode rejeitar esta locação');
    }

    if (locacao.status !== 'PENDENTE') {
      throw new AppError('Somente locações pendentes podem ser rejeitadas', 409, 'INVALID_STATUS');
    }

    const atualizada = await this.prisma.locacao.update({
      where: { id: locacaoId },
      data: { status: 'CANCELADA' },
      include: { item: true },
    });

    return toLocacaoDTO(atualizada);
  }

  /** RF14 — locações em que o usuário autenticado é o locatário. */
  async listarComoLocatario(condominioId: string, locatarioId: string): Promise<LocacaoDTO[]> {
    const locacoes = await this.prisma.locacao.findMany({
      where: { locatarioId, item: { condominioId } },
      include: { item: true },
      orderBy: { createdAt: 'desc' },
    });

    return locacoes.map(toLocacaoDTO);
  }

  /** RF12/RF14 — locações recebidas para itens do usuário autenticado (visão do proprietário). */
  async listarComoProprietario(condominioId: string, ownerId: string): Promise<LocacaoDTO[]> {
    const locacoes = await this.prisma.locacao.findMany({
      where: { item: { condominioId, ownerId } },
      include: { item: true },
      orderBy: { createdAt: 'desc' },
    });

    return locacoes.map(toLocacaoDTO);
  }

  private async buscarComItemOuFalhar(locacaoId: string): Promise<LocacaoComItem> {
    const locacao = await this.prisma.locacao.findUnique({
      where: { id: locacaoId },
      include: { item: true },
    });

    if (!locacao) {
      throw new NotFoundError('Locação não encontrada');
    }

    return locacao;
  }
}
