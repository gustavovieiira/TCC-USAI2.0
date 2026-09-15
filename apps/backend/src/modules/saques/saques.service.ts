import { Prisma, PrismaClient, SolicitacaoSaque } from '@prisma/client';
import { AppError, NotFoundError } from '@/common/errors';
import {
  ListarSaquesFiltro,
  RejeitarSaqueInput,
  SaqueDTO,
  SolicitarSaqueInput,
} from './saques.types';

function toSaqueDTO(saque: SolicitacaoSaque): SaqueDTO {
  return {
    id: saque.id,
    userId: saque.userId,
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
   * Morador solicita o saque do saldo acumulado com locações pagas.
   * Nota: ainda não valida contra o saldo real disponível — isso depende do M3 (Asaas) popular
   * `Pagamento` com locações efetivamente pagas. Por ora só registra a solicitação como PENDENTE
   * para o Admin USAI avaliar; a validação de saldo entra quando o M3 for implementado.
   */
  async solicitar(userId: string, input: SolicitarSaqueInput): Promise<SaqueDTO> {
    const saque = await this.prisma.solicitacaoSaque.create({
      data: {
        userId,
        valor: input.valor,
        chavePixUsada: input.chavePixUsada,
        status: 'PENDENTE',
      },
    });

    return toSaqueDTO(saque);
  }

  async listarPorUsuario(userId: string): Promise<SaqueDTO[]> {
    const saques = await this.prisma.solicitacaoSaque.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return saques.map(toSaqueDTO);
  }

  /** Admin USAI — visão global das solicitações, opcionalmente filtrada por status. */
  async listarTodas(filtro: ListarSaquesFiltro = {}): Promise<SaqueDTO[]> {
    const saques = await this.prisma.solicitacaoSaque.findMany({
      where: filtro.status ? { status: filtro.status } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return saques.map(toSaqueDTO);
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
