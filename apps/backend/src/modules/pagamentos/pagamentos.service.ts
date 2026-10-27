import { Item, Locacao, PrismaClient } from '@prisma/client';
import { AppError, ForbiddenError, NotFoundError } from '@/common/errors';
import { logger } from '@/common/logger';
import { registrarPagamentoConfirmado } from '@/modules/lancamentos/lancamentos.service';
import { calcularRepasse } from '@/modules/locacoes/locacoes.service';
import { formatarReais } from '@/modules/notificacoes/notificacoes.format';
import { NotificacoesService } from '@/modules/notificacoes/notificacoes.service';
import { emitirParaUsuario } from '@/realtime/emitter';
import { AsaasClient } from './asaas.client';
import { CriarCobrancaResultado } from './pagamentos.types';

const DIAS_ATE_VENCIMENTO = 2;

/** Status do Asaas que significam "dinheiro recebido": RECEIVED é o do PIX, CONFIRMED o de cartão/boleto. */
const STATUS_ASAAS_PAGO = ['RECEIVED', 'CONFIRMED'];
const JANELA_CONFERENCIA_DIAS = 14;
const LIMITE_CONFERENCIA = 100;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * M3 — cobrança do locatário via Asaas (PIX) e confirmação por webhook. O dono do item recebe o
 * valor via saque manual já existente (`saques.service.ts`), não por split automático do Asaas —
 * ver `docs/progresso.md` pra decisão de produto completa.
 */
export class PagamentosService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly asaas: AsaasClient,
    private readonly notificacoes?: NotificacoesService,
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
   * Rede de segurança do webhook: pergunta ao Asaas o status das cobranças ainda pendentes e
   * confirma as que já foram pagas, pelo mesmo caminho do webhook (`confirmarPagamento`, que é
   * idempotente — se os dois chegarem, o segundo não faz nada). Cobre webhook atrasado, fila
   * pausada (o Asaas pausa após 15 falhas seguidas) e ambiente sem endereço público (dev local).
   * Uma cobrança que falha na consulta não impede a conferência das demais. Retorna quantas
   * foram confirmadas nesta rodada.
   */
  async conferirPendentes(): Promise<number> {
    const desde = new Date(Date.now() - JANELA_CONFERENCIA_DIAS * MS_POR_DIA);

    const pendentes = await this.prisma.pagamento.findMany({
      where: { status: 'PENDENTE', asaasChargeId: { not: null }, createdAt: { gte: desde } },
      orderBy: { createdAt: 'asc' },
      take: LIMITE_CONFERENCIA,
    });

    let confirmados = 0;

    for (const pagamento of pendentes) {
      const chargeId = pagamento.asaasChargeId;
      if (!chargeId) continue;

      try {
        const cobranca = await this.asaas.buscarCobranca(chargeId);
        if (STATUS_ASAAS_PAGO.includes(cobranca.status)) {
          await this.confirmarPagamento(chargeId);
          confirmados += 1;
        }
      } catch (error) {
        logger.error('Falha ao conferir cobrança no Asaas', { chargeId, error });
      }
    }

    return confirmados;
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

      const repasse = calcularRepasse(Number(pagamento.valor));
      const flipLocacao = await tx.locacao.updateMany({
        where: { id: pagamento.locacaoId, status: 'APROVADA' },
        data: { status: 'PAGA', ...repasse },
      });

      if (flipLocacao.count === 0) {
        await tx.pagamento.update({ where: { id: pagamento.id }, data: { status: 'PAGO_ORFAO' } });
        logger.error(
          'Pagamento Asaas confirmado pra uma locação que não está mais APROVADA (corrida perdida) — reembolso manual necessário',
          { asaasChargeId, locacaoId: pagamento.locacaoId },
        );
        const perdida = await tx.locacao.findUnique({
          where: { id: pagamento.locacaoId },
          include: { item: true },
        });
        return { orfao: true as const, locacao: perdida, valor: Number(pagamento.valor) };
      }

      const locacao = await tx.locacao.findUniqueOrThrow({
        where: { id: pagamento.locacaoId },
        include: { item: true, locatario: true },
      });

      // Livro-razão: dono recebe o líquido, síndicos recebem os 10% (ou a USAI, sem síndico).
      const registro = await registrarPagamentoConfirmado(tx, {
        locacaoId: locacao.id,
        itemTitulo: locacao.item.titulo,
        condominioId: locacao.item.condominioId,
        donoId: locacao.item.ownerId,
        locatarioId: locacao.locatarioId,
        valorBruto: Number(pagamento.valor),
        taxa: repasse.taxaPlataforma,
        valorLiquido: repasse.valorLiquido,
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

      return { orfao: false as const, locacao, concorrentes, repasse, registro };
    });

    if (!resultado) return;

    if (resultado.orfao) {
      await this.avisarPagamentoOrfao(resultado.locacao, resultado.valor);
      return;
    }

    const { locacao, concorrentes, repasse, registro } = resultado;

    emitirParaUsuario(locacao.locatarioId, 'locacao:atualizada', {
      locacaoId: locacao.id,
      status: 'PAGA',
    });
    emitirParaUsuario(locacao.item.ownerId, 'locacao:atualizada', {
      locacaoId: locacao.id,
      status: 'PAGA',
    });

    await this.notificacoes?.notificar({
      userId: locacao.locatarioId,
      tipo: 'PAGAMENTO_CONFIRMADO',
      titulo: 'Pagamento confirmado',
      mensagem: `Recebemos o seu pagamento de "${locacao.item.titulo}". O item está reservado para você.`,
      link: '/locacoes',
    });
    await this.notificacoes?.notificar({
      userId: locacao.item.ownerId,
      tipo: 'PAGAMENTO_RECEBIDO',
      titulo: 'Você recebeu um pagamento',
      mensagem: `${locacao.locatario.nome} pagou "${locacao.item.titulo}". Entraram ${formatarReais(repasse.valorLiquido)} no seu saldo (já descontada a taxa de ${formatarReais(repasse.taxaPlataforma)}).`,
      link: '/saques',
    });

    for (const comissao of registro.comissoes) {
      await this.notificacoes?.notificar({
        userId: comissao.userId,
        tipo: 'COMISSAO_RECEBIDA',
        titulo: 'Você recebeu uma comissão do condomínio',
        mensagem: `${formatarReais(comissao.valor)} de comissão (${formatarReais(repasse.taxaPlataforma)} de taxa sobre o aluguel de "${locacao.item.titulo}"${registro.comissoes.length > 1 ? `, dividida entre ${registro.comissoes.length} síndicos` : ''}).`,
        link: '/saques',
      });
    }

    await Promise.all(
      concorrentes.map(async (concorrente) => {
        emitirParaUsuario(concorrente.locatarioId, 'locacao:atualizada', {
          locacaoId: concorrente.id,
          status: 'CANCELADA',
        });
        await this.notificacoes?.notificar({
          userId: concorrente.locatarioId,
          tipo: 'LOCACAO_CANCELADA',
          titulo: 'Seu pedido foi cancelado',
          mensagem: `Outra pessoa pagou "${locacao.item.titulo}" para o mesmo período antes de você.`,
          link: '/locacoes',
        });
        if (concorrente.pagamento?.asaasChargeId) {
          await this.asaas.cancelarCobranca(concorrente.pagamento.asaasChargeId);
        }
      }),
    );
  }

  /** Perdeu a corrida: avisa o locatário (que já pagou) e o Admin, que precisa devolver o dinheiro. */
  private async avisarPagamentoOrfao(
    locacao: (Locacao & { item: Item }) | null,
    valor: number,
  ): Promise<void> {
    if (!locacao) return;

    await this.notificacoes?.notificar({
      userId: locacao.locatarioId,
      tipo: 'PAGAMENTO_REEMBOLSO',
      titulo: 'Seu pagamento será reembolsado',
      mensagem: `Você pagou ${formatarReais(valor)} por "${locacao.item.titulo}", mas outra pessoa pagou o mesmo período antes. A equipe USAI vai devolver o seu valor.`,
      link: '/saques',
    });
    await this.notificacoes?.notificarAdmins({
      tipo: 'PAGAMENTO_REEMBOLSO',
      titulo: 'Reembolso manual necessário',
      mensagem: `Pagamento de ${formatarReais(valor)} de "${locacao.item.titulo}" confirmado, mas o período já estava ocupado. Devolva o valor pelo Asaas.`,
      link: '/admin',
    });
  }
}
