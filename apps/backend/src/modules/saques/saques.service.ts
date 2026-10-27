import { Condominio, Prisma, PrismaClient, SolicitacaoSaque, User } from '@prisma/client';
import { AppError, NotFoundError } from '@/common/errors';
import {
  INCLUIR_ORIGEM,
  TIPO_ALUGUEL_PAGO,
  TIPO_COMISSAO_CONDOMINIO,
  toOrigemDTO,
} from '@/modules/lancamentos/lancamentos.service';
import { formatarReais } from '@/modules/notificacoes/notificacoes.format';
import { NotificacoesService } from '@/modules/notificacoes/notificacoes.service';
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
  APROVADO: 'APROVADO',
  PAGO: 'PAGO',
  REJEITADO: 'REJEITADO',
} as const;

/** Include padrão das operações do Admin: devolve nome e condomínio de quem pediu o saque. */
const INCLUIR_SOLICITANTE = { user: { include: { condominio: true } } } as const;

type SaqueComSolicitante = SolicitacaoSaque & { user: User & { condominio: Condominio | null } };

function toSaqueDTO(saque: SolicitacaoSaque, solicitante?: SaqueComSolicitante['user']): SaqueDTO {
  return {
    id: saque.id,
    userId: saque.userId,
    solicitanteNome: solicitante?.nome,
    solicitanteCondominio: solicitante ? (solicitante.condominio?.nome ?? null) : undefined,
    valor: Number(saque.valor),
    chavePixUsada: saque.chavePixUsada,
    status: saque.status,
    motivoRejeicao: saque.motivoRejeicao,
    createdAt: saque.createdAt,
    processadoEm: saque.processadoEm,
    pagoEm: saque.pagoEm,
  };
}

export class SaquesService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly notificacoes?: NotificacoesService,
  ) {}

  /**
   * Saldo líquido disponível pra saque: soma do valor das locações já pagas ao dono (RN — ver
   * `STATUS_QUE_GERAM_SALDO`), já descontada a taxa da plataforma (soma de `Locacao.valorLiquido`,
   * gravado ao confirmar cada pagamento — ver `calcularRepasse`), menos o que já foi sacado
   * (APROVADO ou PAGO — o valor sai do saldo na aprovação, antes mesmo do PIX ser transferido) e
   * menos o que já está em análise (PENDENTE) — assim, duas solicitações pendentes ao mesmo tempo não conseguem,
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
      cliente.lancamento.aggregate({
        where: { userId, afetaSaldo: true },
        _sum: { valor: true },
      }),
      cliente.solicitacaoSaque.aggregate({
        where: { userId, status: { in: ['APROVADO', 'PAGO'] } },
        _sum: { valor: true },
      }),
      cliente.solicitacaoSaque.aggregate({
        where: { userId, status: 'PENDENTE' },
        _sum: { valor: true },
      }),
    ]);

    const totalLiquido = Number(recebido._sum.valor ?? 0);
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
    const saque = await this.prisma.$transaction(async (tx) => {
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
        include: { user: true },
      });

      return saque;
    });

    await this.notificacoes?.notificarAdmins({
      tipo: 'SAQUE_SOLICITADO',
      titulo: 'Novo pedido de saque',
      mensagem: `${saque.user.nome} pediu um saque de ${formatarReais(Number(saque.valor))}.`,
      link: '/admin',
    });

    return toSaqueDTO(saque);
  }

  /**
   * Extrato do usuário, sempre escopado por `userId` (vem do token, ou do parâmetro de rota na
   * visão do Admin). Montado do livro-razão (`Lancamento`): cada entrada traz de onde veio (a
   * locação, quem pagou, quem é o dono), a base de cálculo e a taxa aplicada. Separa duas coisas
   * pra não confundir: o que mexe no SALDO (aluguéis recebidos, comissões do condomínio e saques)
   * e o que a pessoa PAGOU como locatário (informativo, não mexe no saldo). O `saldoDisponivel`
   * vem do mesmo `calcularSaldo`, então os números batem. Da contraparte só saem id e nome — nunca
   * e-mail, CPF ou chave PIX de outra pessoa; a chave do próprio usuário sai mascarada, salvo na
   * visão do Admin (que precisa dela pra transferir).
   */
  async extrato(userId: string, opcoes: { revelarChavePix?: boolean } = {}): Promise<ExtratoDTO> {
    const [creditos, saques, pagos, orfaos, saldoDisponivel] = await Promise.all([
      this.prisma.lancamento.findMany({
        where: { userId, afetaSaldo: true },
        include: INCLUIR_ORIGEM,
      }),
      this.prisma.solicitacaoSaque.findMany({ where: { userId } }),
      this.prisma.lancamento.findMany({
        where: { userId, tipo: TIPO_ALUGUEL_PAGO },
        include: INCLUIR_ORIGEM,
      }),
      this.prisma.locacao.findMany({
        where: { locatarioId: userId, pagamento: { is: { status: 'PAGO_ORFAO' } } },
        include: { item: { include: { owner: true } }, pagamento: true },
      }),
      this.calcularSaldo(userId),
    ]);

    const entradas: MovimentoExtratoDTO[] = creditos.map((lancamento) => {
      const comissao = lancamento.tipo === TIPO_COMISSAO_CONDOMINIO;
      const locacao = lancamento.locacao;

      return {
        id: lancamento.id,
        tipo: comissao ? 'COMISSAO' : 'RECEBIMENTO',
        data: lancamento.createdAt,
        descricao: lancamento.descricao,
        contraparte:
          !comissao && locacao ? { id: locacao.locatario.id, nome: locacao.locatario.nome } : null,
        valor: Number(lancamento.valor),
        valorBruto: lancamento.baseCalculo === null ? undefined : Number(lancamento.baseCalculo),
        taxa: locacao?.taxaPlataforma ? Number(locacao.taxaPlataforma) : undefined,
        taxaPercentual:
          lancamento.taxaPercentual === null ? undefined : Number(lancamento.taxaPercentual),
        divididoEntre: lancamento.divididoEntre ?? undefined,
        periodo: locacao ? { inicio: locacao.dataInicio, fim: locacao.dataFim } : undefined,
        origem: locacao ? toOrigemDTO(locacao) : undefined,
        status: 'CONFIRMADO',
      };
    });

    const retiradas: MovimentoExtratoDTO[] = saques.map((saque) => ({
      id: saque.id,
      tipo: 'SAQUE',
      data: saque.createdAt,
      descricao: 'Saque via PIX',
      contraparte: null,
      valor: -Number(saque.valor),
      status: STATUS_SAQUE_NO_EXTRATO[saque.status],
      motivo: saque.motivoRejeicao,
      chavePix: opcoes.revelarChavePix
        ? saque.chavePixUsada
        : mascararChavePix(saque.chavePixUsada),
      processadoEm: saque.processadoEm,
      pagoEm: saque.pagoEm,
    }));

    const movimentos = [...entradas, ...retiradas].sort(
      (a, b) => b.data.getTime() - a.data.getTime(),
    );

    const pagamentosFeitos: PagamentoExtratoDTO[] = pagos.flatMap((lancamento) => {
      const locacao = lancamento.locacao;
      if (!locacao) return [];

      return [
        {
          id: lancamento.id,
          locacaoId: locacao.id,
          data: lancamento.createdAt,
          descricao: lancamento.descricao,
          contraparte: { id: locacao.item.owner.id, nome: locacao.item.owner.nome },
          valor: Number(lancamento.valor),
          taxa: locacao.taxaPlataforma ? Number(locacao.taxaPlataforma) : undefined,
          repasseDono: locacao.valorLiquido ? Number(locacao.valorLiquido) : undefined,
          taxaPercentual:
            lancamento.taxaPercentual === null ? undefined : Number(lancamento.taxaPercentual),
          periodo: { inicio: locacao.dataInicio, fim: locacao.dataFim },
          status: 'CONFIRMADO' as const,
        },
      ];
    });

    const pagamentosOrfaos: PagamentoExtratoDTO[] = orfaos.map((locacao) => ({
      id: locacao.id,
      locacaoId: locacao.id,
      data: locacao.pagamento?.pagoEm ?? locacao.updatedAt,
      descricao: `Aluguel de "${locacao.item.titulo}"`,
      contraparte: { id: locacao.item.owner.id, nome: locacao.item.owner.nome },
      valor: Number(locacao.pagamento?.valor ?? locacao.valorTotal),
      periodo: { inicio: locacao.dataInicio, fim: locacao.dataFim },
      status: 'EM_REEMBOLSO' as const,
    }));

    const pagamentos = [...pagamentosFeitos, ...pagamentosOrfaos].sort(
      (a, b) => b.data.getTime() - a.data.getTime(),
    );

    const somar = (itens: { valor: number }[]) =>
      arredondarCentavos(itens.reduce((total, item) => total + item.valor, 0));

    return {
      resumo: {
        saldoDisponivel,
        totalRecebido: somar(entradas.filter((m) => m.tipo === 'RECEBIMENTO')),
        totalComissoes: somar(entradas.filter((m) => m.tipo === 'COMISSAO')),
        totalSacado: Math.abs(somar(retiradas.filter((m) => m.status === 'PAGO'))),
        aPagar: Math.abs(somar(retiradas.filter((m) => m.status === 'APROVADO'))),
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
      include: INCLUIR_SOLICITANTE,
      orderBy: { createdAt: 'desc' },
    });

    return saques.map((saque) => toSaqueDTO(saque, saque.user));
  }

  /** Admin USAI aprova — grava em LogAuditoria para rastreabilidade financeira. */
  async aprovar(saqueId: string, adminId: string): Promise<SaqueDTO> {
    await this.buscarPendenteOuFalhar(saqueId);

    const atualizado = await this.prisma.solicitacaoSaque.update({
      where: { id: saqueId },
      data: { status: 'APROVADO', processadoEm: new Date() },
      include: INCLUIR_SOLICITANTE,
    });

    await this.registrarAuditoria(adminId, 'APROVAR_SAQUE', saqueId);

    await this.notificacoes?.notificar({
      userId: atualizado.userId,
      tipo: 'SAQUE_APROVADO',
      titulo: 'Saque aprovado',
      mensagem: `Seu saque de ${formatarReais(Number(atualizado.valor))} foi aprovado. Assim que o PIX for transferido, você recebe outro aviso.`,
      link: '/saques',
    });

    return toSaqueDTO(atualizado, atualizado.user);
  }

  /**
   * Admin USAI confirma que o PIX do saque aprovado foi transferido (APROVADO → PAGO). É o que o
   * usuário vê como "Pago" no extrato e no recibo; também auditado.
   */
  async marcarComoPago(saqueId: string, adminId: string): Promise<SaqueDTO> {
    const saque = await this.prisma.solicitacaoSaque.findUnique({ where: { id: saqueId } });

    if (!saque) {
      throw new NotFoundError('Solicitação de saque não encontrada');
    }

    if (saque.status !== 'APROVADO') {
      throw new AppError('Só é possível marcar como pago um saque aprovado', 409, 'INVALID_STATUS');
    }

    const atualizado = await this.prisma.solicitacaoSaque.update({
      where: { id: saqueId },
      data: { status: 'PAGO', pagoEm: new Date() },
      include: INCLUIR_SOLICITANTE,
    });

    await this.registrarAuditoria(adminId, 'PAGAR_SAQUE', saqueId);

    await this.notificacoes?.notificar({
      userId: atualizado.userId,
      tipo: 'SAQUE_PAGO',
      titulo: 'Saque pago',
      mensagem: `O PIX de ${formatarReais(Number(atualizado.valor))} foi enviado para a chave ${mascararChavePix(atualizado.chavePixUsada)}. Você já pode gerar o recibo no extrato.`,
      link: '/saques',
    });

    return toSaqueDTO(atualizado, atualizado.user);
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
      include: INCLUIR_SOLICITANTE,
    });

    await this.registrarAuditoria(adminId, 'REJEITAR_SAQUE', saqueId, {
      motivoRejeicao: input.motivoRejeicao,
    });

    await this.notificacoes?.notificar({
      userId: atualizado.userId,
      tipo: 'SAQUE_REJEITADO',
      titulo: 'Saque rejeitado',
      mensagem: `Seu saque de ${formatarReais(Number(atualizado.valor))} foi rejeitado: ${input.motivoRejeicao}. O valor voltou para o seu saldo.`,
      link: '/saques',
    });

    return toSaqueDTO(atualizado, atualizado.user);
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
