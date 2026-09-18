import { Condominio, Item, Locacao, PrismaClient, User } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '@/common/errors';
import { STATUS_QUE_OCUPAM_PERIODO } from '@/modules/locacoes/locacoes.service';
import { AtualizarPinInput, CondominioDTO, LocacaoAtivaDTO, MoradorDTO } from './sindico.types';

type LocacaoComItemELocatario = Locacao & { item: Item; locatario: User };

function toMoradorDTO(user: User): MoradorDTO {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    apartamento: user.apartamento,
    createdAt: user.createdAt,
  };
}

function toLocacaoAtivaDTO(locacao: LocacaoComItemELocatario): LocacaoAtivaDTO {
  return {
    id: locacao.id,
    status: locacao.status,
    dataInicio: locacao.dataInicio,
    dataFim: locacao.dataFim,
    valorTotal: Number(locacao.valorTotal),
    item: { id: locacao.item.id, titulo: locacao.item.titulo, ownerId: locacao.item.ownerId },
    locatario: { id: locacao.locatario.id, nome: locacao.locatario.nome },
  };
}

function toCondominioDTO(condominio: Condominio): CondominioDTO {
  return {
    id: condominio.id,
    nome: condominio.nome,
    linkSlug: condominio.linkSlug,
    pin: condominio.pin,
    ativo: condominio.ativo,
  };
}

export class SindicoService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Moradores ativos vinculados ao condomínio do síndico autenticado. */
  async listarMoradores(condominioId: string): Promise<MoradorDTO[]> {
    const moradores = await this.prisma.user.findMany({
      where: { condominioId, papel: 'MORADOR', ativo: true },
      orderBy: { nome: 'asc' },
    });

    return moradores.map(toMoradorDTO);
  }

  /**
   * Remoção lógica (ativo=false): o morador deixa de conseguir logar e some da lista de moradores,
   * mas o histórico (itens, locações, posts, mensagens) permanece intacto para auditoria — mesmo
   * padrão de soft delete já usado em Item/Condominio.
   */
  async removerMorador(condominioId: string, moradorId: string): Promise<void> {
    const morador = await this.prisma.user.findUnique({ where: { id: moradorId } });

    if (!morador || morador.condominioId !== condominioId) {
      throw new NotFoundError('Morador não encontrado neste condomínio');
    }

    if (morador.papel !== 'MORADOR') {
      throw new ForbiddenError('Só é possível remover contas de morador');
    }

    await this.prisma.user.update({ where: { id: moradorId }, data: { ativo: false } });
  }

  /** Locações que ainda ocupam algum item do condomínio (mesmo critério de bloqueio de sobreposição). */
  async listarLocacoesAtivas(condominioId: string): Promise<LocacaoAtivaDTO[]> {
    const locacoes = await this.prisma.locacao.findMany({
      where: { status: { in: STATUS_QUE_OCUPAM_PERIODO }, item: { condominioId } },
      include: { item: true, locatario: true },
      orderBy: { dataInicio: 'asc' },
    });

    return locacoes.map(toLocacaoAtivaDTO);
  }

  async buscarCondominio(condominioId: string): Promise<CondominioDTO> {
    const condominio = await this.buscarCondominioOuFalhar(condominioId);
    return toCondominioDTO(condominio);
  }

  /** Síndico gerencia o PIN de acesso do próprio condomínio (RN03 do módulo de auth usa esse PIN). */
  async atualizarPin(condominioId: string, input: AtualizarPinInput): Promise<CondominioDTO> {
    await this.buscarCondominioOuFalhar(condominioId);

    const atualizado = await this.prisma.condominio.update({
      where: { id: condominioId },
      data: { pin: input.pin },
    });

    return toCondominioDTO(atualizado);
  }

  private async buscarCondominioOuFalhar(condominioId: string): Promise<Condominio> {
    const condominio = await this.prisma.condominio.findUnique({ where: { id: condominioId } });

    if (!condominio) {
      throw new NotFoundError('Condomínio não encontrado');
    }

    return condominio;
  }
}
