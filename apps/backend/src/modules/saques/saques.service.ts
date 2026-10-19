import { Prisma, PrismaClient, SolicitacaoSaque } from '@prisma/client';
import { AppError, NotFoundError } from '@/common/errors';
import { STATUS_QUE_GERAM_SALDO } from '@/modules/locacoes/locacoes.service';
import {
  ExtratoDTO,
  ListarSaquesFiltro,
  MovimentoExtratoDTO,
  PagamentoExtratoDTO,
  RejeitarSaqueInput,
  SaqueDTO,
  SolicitarSaqueInput,
} from './saques.types';

function arredondarCentavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** O extrato mostra a chave PIX sem expô-la inteira: e-mail some no meio, o resto mostra só os 4 últimos caracteres. */
function mascararChavePix(chave: string): string {
  const arroba = chave.indexOf('@');
  if (arroba > 0) return `${chave[0]}***${chave.slice(arroba)}`;
  return chave.length <= 4 ? chave : `****${chave.slice(-4)}`;
}

const STATUS_SAQUE_NO_EXTRATO = {
  PENDENTE: 'EM_ANALISE',
  APROVADO: 'PAGO',
  REJEITADO: 'REJEITADO',
} as const;

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
   * `STATUS_QUE_GERAM_SALDO`), já descontada a taxa da plataforma (soma de `Locacao.valorLiquido`,
   * gravado ao confirmar cada pagamento — ver `calcularRepasse`), menos o que já foi sacado
   * (APROVADO) e menos o que já está em análise (PENDENTE) — assim, duas solicitações pendentes ao mesmo tempo não conseguem,
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
        _sum: { valorLiquido: true },
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

    const totalLiquido = Number(recebido._sum.valorLiquido ?? 0);
    const jaSacado = Number(aprovado._sum.valor ?? 0);
    const emAnalise = Number(pendente._sum.valor ?? 0);

    return Math.max(0, arredondarCentavos(totalLiquido - jaSacado - emAnalise));
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

  /**
   * Extrato do usuário, sempre escopado por `userId` (vem do token, nunca de parâmetro). Separa
   * duas coisas pra não confundir: o que mexe no SALDO (aluguéis recebidos já com a taxa
   * descontada, e saques) e o que a pessoa PAGOU como locatário (informativo, não mexe no saldo).
   * O `saldoDisponivel` vem do mesmo `calcularSaldo` da tela de Perfil, então os números batem.
   * Da contraparte só saem id e nome — nunca e-mail, CPF ou chave PIX de outra pessoa.
   */
  async extrato(userId: string): Promise<ExtratoDTO> {
    const [recebidas, saques, pagas, saldoDisponivel] = await Promise.all([
      this.prisma.locacao.findMany({
        where: { item: { ownerId: userId }, status: { in: STATUS_QUE_GERAM_SALDO } },
        include: { item: true, locatario: true, pagamento: true },
      }),
      this.prisma.solicitacaoSaque.findMany({ where: { userId } }),
      this.prisma.locacao.findMany({
        where: {
          locatarioId: userId,
          pagamento: { is: { status: { in: ['PAGO', 'PAGO_ORFAO'] } } },
        },
        include: { item: { include: { owner: true } }, pagamento: true },
      }),
      this.calcularSaldo(userId),
    ]);

    const recebimentos: MovimentoExtratoDTO[] = recebidas.map((locacao) => ({
      id: locacao.id,
      tipo: 'RECEBIMENTO',
      data: locacao.pagamento?.pagoEm ?? locacao.updatedAt,
      descricao: `Aluguel de "${locacao.item.titulo}"`,
      contraparte: { id: locacao.locatario.id, nome: locacao.locatario.nome },
      valor: Number(locacao.valorLiquido ?? 0),
      valorBruto: Number(locacao.valorTotal),
      taxa: Number(locacao.taxaPlataforma ?? 0),
      status: 'CONFIRMADO',
    }));

    const retiradas: MovimentoExtratoDTO[] = saques.map((saque) => ({
      id: saque.id,
      tipo: 'SAQUE',
      data: saque.createdAt,
      descricao: 'Saque via PIX',
      contraparte: null,
      valor: -Number(saque.valor),
      status: STATUS_SAQUE_NO_EXTRATO[saque.status],
      motivo: saque.motivoRejeicao,
      chavePix: mascararChavePix(saque.chavePixUsada),
      processadoEm: saque.processadoEm,
    }));

    const movimentos = [...recebimentos, ...retiradas].sort(
      (a, b) => b.data.getTime() - a.data.getTime(),
    );

    const pagamentos: PagamentoExtratoDTO[] = pagas
      .map((locacao) => ({
        id: locacao.id,
        data: locacao.pagamento?.pagoEm ?? locacao.updatedAt,
        descricao: `Aluguel de "${locacao.item.titulo}"`,
        contraparte: { id: locacao.item.owner.id, nome: locacao.item.owner.nome },
        valor: Number(locacao.pagamento?.valor ?? locacao.valorTotal),
        status:
          locacao.pagamento?.status === 'PAGO_ORFAO'
            ? ('EM_REEMBOLSO' as const)
            : ('CONFIRMADO' as const),
      }))
      .sort((a, b) => b.data.getTime() - a.data.getTime());

    const somar = (itens: { valor: number }[]) =>
      arredondarCentavos(itens.reduce((total, item) => total + item.valor, 0));

    return {
      resumo: {
        saldoDisponivel,
        totalRecebido: somar(recebimentos),
        totalSacado: Math.abs(somar(retiradas.filter((m) => m.status === 'PAGO'))),
        emAnalise: Math.abs(somar(retiradas.filter((m) => m.status === 'EM_ANALISE'))),
      },
      movimentos,
      pagamentos,
    };
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
