import { PrismaClient } from '@prisma/client';
import { AppError, ForbiddenError, NotFoundError } from '@/common/errors';
import { logger } from '@/common/logger';
import { emitirParaUsuario } from '@/realtime/emitter';
import { AsaasClient } from './asaas.client';
import { CriarCobrancaResultado } from './pagamentos.types';

const DIAS_ATE_VENCIMENTO = 2;

/**
 * M3 — cobrança do locatário via Asaas (PIX) e confirmação por webhook. O dono do item recebe o
 * valor via saque manual já existente (`saques.service.ts`), não por split automático do Asaas —
 * ver `docs/progresso.md` pra decisão de produto completa.
 */
export class PagamentosService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly asaas: AsaasClient,
  ) {}

  /**
   * Locatário gera (ou recupera, se já pediu antes) o link de pagamento PIX de uma locação
   * aprovada. Idempotente: se já existe uma cobrança criada, reaproveita em vez de chamar o
   * Asaas de novo.
   */
  async criarCobranca(locacaoId: string, locatarioId: string): Promise<CriarCobrancaResultado> {
    const locacao = await this.prisma.locacao.findUnique({
      where: { id: locacaoId },
      include: { item: true, locatario: true, pagamento: true },
    });

    if (!locacao) {
      throw new NotFoundError('Locação não encontrada');
    }

    if (locacao.locatarioId !== locatarioId) {
      throw new ForbiddenError('Você não é o locatário desta locação');
    }

    if (locacao.status !== 'APROVADA') {
      throw new AppError('Só é possível pagar uma locação aprovada', 409, 'INVALID_STATUS');
    }

    if (locacao.pagamento?.invoiceUrl) {
      return { invoiceUrl: locacao.pagamento.invoiceUrl };
    }

    const locatario = locacao.locatario;
    if (!locatario.cpf) {
      throw new AppError(
        'Cadastre seu CPF no perfil antes de pagar uma locação',
        400,
        'CPF_OBRIGATORIO',
      );
    }

    let asaasCustomerId = locatario.asaasCustomerId;
    if (!asaasCustomerId) {
      const cliente = await this.asaas.criarCliente({
        nome: locatario.nome,
        cpfCnpj: locatario.cpf,
        email: locatario.email,
      });
      asaasCustomerId = cliente.id;
      await this.prisma.user.update({
        where: { id: locatario.id },
        data: { asaasCustomerId },
      });
    }

    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + DIAS_ATE_VENCIMENTO);

    const cobranca = await this.asaas.criarCobrancaPix({
      customerId: asaasCustomerId,
      valor: Number(locacao.valorTotal),
      vencimento,
      externalReference: locacao.id,
      descricao: `Locação: ${locacao.item.titulo}`,
    });

    await this.prisma.pagamento.upsert({
      where: { locacaoId: locacao.id },
      create: {
        locacaoId: locacao.id,
        asaasChargeId: cobranca.id,
        invoiceUrl: cobranca.invoiceUrl,
        valor: locacao.valorTotal,
        status: 'PENDENTE',
      },
      update: {
        asaasChargeId: cobranca.id,
        invoiceUrl: cobranca.invoiceUrl,
      },
    });

    return { invoiceUrl: cobranca.invoiceUrl };
  }

  /**
   * Disparado pelo webhook do Asaas quando um PIX é confirmado. Idempotente contra reentrega do
   * mesmo evento (o `updateMany` guardado por status garante isso). Se a locação já não está mais
   * APROVADA (perdeu a corrida pra outra locação concorrente que pagou primeiro), o pagamento fica
   * marcado como órfão pro Admin reembolsar manualmente — não há estorno automático nesta versão.
   */
  async confirmarPagamento(asaasChargeId: string): Promise<void> {
    const resultado = await this.prisma.$transaction(async (tx) => {
      const flipPagamento = await tx.pagamento.updateMany({
        where: { asaasChargeId, status: 'PENDENTE' },
        data: { status: 'PAGO', pagoEm: new Date() },
      });
      if (flipPagamento.count === 0) return null;

      const pagamento = await tx.pagamento.findUnique({ where: { asaasChargeId } });
      if (!pagamento) return null;

      const flipLocacao = await tx.locacao.updateMany({
        where: { id: pagamento.locacaoId, status: 'APROVADA' },
        data: { status: 'PAGA' },
      });

      if (flipLocacao.count === 0) {
        await tx.pagamento.update({ where: { id: pagamento.id }, data: { status: 'PAGO_ORFAO' } });
        logger.error(
          'Pagamento Asaas confirmado pra uma locação que não está mais APROVADA (corrida perdida) — reembolso manual necessário',
          { asaasChargeId, locacaoId: pagamento.locacaoId },
        );
        return null;
      }

      const locacao = await tx.locacao.findUniqueOrThrow({
        where: { id: pagamento.locacaoId },
        include: { item: true },
      });

      const concorrentes = await tx.locacao.findMany({
        where: {
          itemId: locacao.itemId,
          id: { not: locacao.id },
          status: { in: ['PENDENTE', 'APROVADA'] },
          dataInicio: { lt: locacao.dataFim },
          dataFim: { gt: locacao.dataInicio },
        },
        include: { pagamento: true },
      });

      if (concorrentes.length > 0) {
        await tx.locacao.updateMany({
          where: { id: { in: concorrentes.map((c) => c.id) } },
          data: { status: 'CANCELADA' },
        });
        await tx.pagamento.updateMany({
          where: {
            locacaoId: { in: concorrentes.map((c) => c.id) },
            status: 'PENDENTE',
          },
          data: { status: 'CANCELADO' },
        });
      }

      return { locacao, concorrentes };
    });

    if (!resultado) return;

    const { locacao, concorrentes } = resultado;

    emitirParaUsuario(locacao.locatarioId, 'locacao:atualizada', {
      locacaoId: locacao.id,
      status: 'PAGA',
    });
    emitirParaUsuario(locacao.item.ownerId, 'locacao:atualizada', {
      locacaoId: locacao.id,
      status: 'PAGA',
    });

    await Promise.all(
      concorrentes.map(async (concorrente) => {
        emitirParaUsuario(concorrente.locatarioId, 'locacao:atualizada', {
          locacaoId: concorrente.id,
          status: 'CANCELADA',
        });
        if (concorrente.pagamento?.asaasChargeId) {
          await this.asaas.cancelarCobranca(concorrente.pagamento.asaasChargeId);
        }
      }),
    );
  }
}
