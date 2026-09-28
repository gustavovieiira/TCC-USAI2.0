import { Prisma, PrismaClient, SolicitacaoSaque } from '@prisma/client';
import { AppError, NotFoundError } from '@/common/errors';
import { STATUS_QUE_GERAM_SALDO, TAXA_PLATAFORMA } from '@/modules/locacoes/locacoes.service';
import {
  ListarSaquesFiltro,
  RejeitarSaqueInput,
  SaqueDTO,
  SolicitarSaqueInput,
} from './saques.types';

function arredondarCentavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function toSaqueDTO(saque: SolicitacaoSaque, solicitanteNome?: string): SaqueDTO {
  return {
    id: saque.id,
    userId: saque.userId,
    solicitanteNome,
    valor: Number(saque.valor),
    chavePixUsada: saque.chavePixUsada,
    status: saque.status,
    motivoRejeicao: saque.motivoRejeicao,
    createdAt: saque.createdAt,
    processadoEm: saque.processadoEm,
  };
}

export class SaquesService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Saldo líquido disponível pra saque: soma do valor das locações já pagas ao dono (RN — ver
   * `STATUS_QUE_GERAM_SALDO`), já descontada a taxa da plataforma (`TAXA_PLATAFORMA`, 10% — o
   * dono recebe 90% do valor da locação), menos o que já foi sacado (APROVADO) e menos o que já
   * está em análise (PENDENTE) — assim, duas solicitações pendentes ao mesmo tempo não conseguem,
   * juntas, sacar mais do que a pessoa realmente recebeu. REJEITADO não desconta (o valor volta a
   * ficar disponível). A transição pra PAGA é feita pelo M3 (`pagamentos.service.ts`), disparada
   * pelo webhook do Asaas confirmando o pagamento do locatário.
   */
  async calcularSaldo(userId: string): Promise<number> {
    return this.calcularSaldoComCliente(this.prisma, userId);
  }

  private async calcularSaldoComCliente(
    cliente: Prisma.TransactionClient | PrismaClient,
    userId: string,
  ): Promise<number> {
    const [recebido, aprovado, pendente] = await Promise.all([
      cliente.locacao.aggregate({
        where: { item: { ownerId: userId }, status: { in: STATUS_QUE_GERAM_SALDO } },
        _sum: { valorTotal: true },
      }),
      cliente.solicitacaoSaque.aggregate({
        where: { userId, status: 'APROVADO' },
        _sum: { valor: true },
      }),
      cliente.solicitacaoSaque.aggregate({
        where: { userId, status: 'PENDENTE' },
        _sum: { valor: true },
      }),
    ]);

    const totalBruto = Number(recebido._sum.valorTotal ?? 0);
    const totalLiquido = arredondarCentavos(totalBruto * (1 - TAXA_PLATAFORMA));
    const jaSacado = Number(aprovado._sum.valor ?? 0);
    const emAnalise = Number(pendente._sum.valor ?? 0);

    return Math.max(0, totalLiquido - jaSacado - emAnalise);
  }

  /**
   * Morador solicita o saque do saldo acumulado com locações pagas. Recalcula o saldo dentro da
   * mesma transação que cria a solicitação, pra duas requisições simultâneas não conseguirem
   * aprovar juntas mais do que o saldo real (a segunda vê o PENDENTE que a primeira acabou de
   * criar antes de decidir se ainda cabe).
   */
  async solicitar(userId: string, input: SolicitarSaqueInput): Promise<SaqueDTO> {
    return this.prisma.$transaction(async (tx) => {
      const saldo = await this.calcularSaldoComCliente(tx, userId);

      if (input.valor > saldo) {
        throw new AppError(
          'Valor solicitado maior que o saldo disponível',
          400,
          'SALDO_INSUFICIENTE',
        );
      }

      const saque = await tx.solicitacaoSaque.create({
        data: {
          userId,
          valor: input.valor,
          chavePixUsada: input.chavePixUsada,
          status: 'PENDENTE',
        },
      });

      return toSaqueDTO(saque);
    });
  }

  async listarPorUsuario(userId: string): Promise<SaqueDTO[]> {
    const saques = await this.prisma.solicitacaoSaque.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return saques.map((saque) => toSaqueDTO(saque));
  }

  /** Admin USAI — visão global das solicitações, com o nome de quem pediu, opcionalmente filtrada por status. */
  async listarTodas(filtro: ListarSaquesFiltro = {}): Promise<SaqueDTO[]> {
    const saques = await this.prisma.solicitacaoSaque.findMany({
      where: filtro.status ? { status: filtro.status } : undefined,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    return saques.map((saque) => toSaqueDTO(saque, saque.user.nome));
  }

  /** Admin USAI aprova — grava em LogAuditoria para rastreabilidade financeira. */
  async aprovar(saqueId: string, adminId: string): Promise<SaqueDTO> {
    await this.buscarPendenteOuFalhar(saqueId);

    const atualizado = await this.prisma.solicitacaoSaque.update({
      where: { id: saqueId },
      data: { status: 'APROVADO', processadoEm: new Date() },
    });

    await this.registrarAuditoria(adminId, 'APROVAR_SAQUE', saqueId);

    return toSaqueDTO(atualizado);
  }

  /** Admin USAI rejeita — exige motivo, também auditado. */
  async rejeitar(saqueId: string, adminId: string, input: RejeitarSaqueInput): Promise<SaqueDTO> {
    await this.buscarPendenteOuFalhar(saqueId);

    const atualizado = await this.prisma.solicitacaoSaque.update({
      where: { id: saqueId },
      data: {
        status: 'REJEITADO',
        motivoRejeicao: input.motivoRejeicao,
        processadoEm: new Date(),
      },
    });

    await this.registrarAuditoria(adminId, 'REJEITAR_SAQUE', saqueId, {
      motivoRejeicao: input.motivoRejeicao,
    });

    return toSaqueDTO(atualizado);
  }

  private async buscarPendenteOuFalhar(saqueId: string): Promise<SolicitacaoSaque> {
    const saque = await this.prisma.solicitacaoSaque.findUnique({ where: { id: saqueId } });

    if (!saque) {
      throw new NotFoundError('Solicitação de saque não encontrada');
    }

    if (saque.status !== 'PENDENTE') {
      throw new AppError(
        'Somente solicitações pendentes podem ser avaliadas',
        409,
        'INVALID_STATUS',
      );
    }

    return saque;
  }

  private async registrarAuditoria(
    adminId: string,
    acao: string,
    alvoId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.logAuditoria.create({
      data: {
        adminId,
        acao,
        alvoTipo: 'SolicitacaoSaque',
        alvoId,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
