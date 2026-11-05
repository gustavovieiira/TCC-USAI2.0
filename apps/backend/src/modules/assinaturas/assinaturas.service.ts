import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Assinatura, CobrancaAssinatura, Prisma, PrismaClient, User } from '@prisma/client';
import { AppError, ConflictError, NotFoundError } from '@/common/errors';
import { normalizarDocumento } from '@/common/documento';
import { logger } from '@/common/logger';
import { Mailer, SmtpMailer, urlDoApp } from '@/common/mailer';
import { BCRYPT_ROUNDS } from '@/modules/auth/auth.service';
import { NotificacoesService } from '@/modules/notificacoes/notificacoes.service';
import { AsaasClient } from '@/modules/pagamentos/asaas.client';
import { DetalhesContratacao, emailAcessoSindico } from './assinaturas.emails';
import {
  buscarPeriodo,
  buscarPlano,
  buscarPlanoDisponivel,
  Periodo,
  PERIODOS,
  Plano,
  planosDisponiveis,
  precoDoPeriodo,
  PrecoDoPeriodo,
  precosDoPlano,
} from './planos';

const MS_POR_DIA = 24 * 60 * 60 * 1000;
/** Dias de tolerância depois do vencimento antes de suspender o condomínio. */
const DIAS_DE_CARENCIA = 5;
const DIAS_ATE_VENCIMENTO_COBRANCA = 7;
const JANELA_CONFERENCIA_DIAS = 14;
const LIMITE_CONFERENCIA = 100;
const INTERVALO_MINIMO_REENVIO_MS = 60 * 1000;

export type StatusAssinatura = 'AGUARDANDO_PAGAMENTO' | 'ATIVA' | 'SUSPENSA';

export interface ContratarInput {
  planoCodigo: string;
  periodoCodigo: string;
  nomeCondominio: string;
  nomeSindico: string;
  email: string;
  cpfCnpj: string;
}

export interface ContratacaoDTO {
  assinaturaId: string;
  status: StatusAssinatura;
  plano: Pick<Plano, 'codigo' | 'nome' | 'valorMensal' | 'limiteMoradores'>;
  /** Período de cobrança escolhido e o valor de cada cobrança (o que o PIX cobra de uma vez). */
  periodo: Pick<Periodo, 'codigo' | 'nome' | 'meses' | 'desconto'>;
  valorCiclo: number;
  nomeCondominio: string;
  /** Link do PIX pra pagar; só existe enquanto o pagamento não foi confirmado. */
  invoiceUrl: string | null;
  /** E-mail do síndico com parte escondida (ex.: g***@dominio.com), pra mostrar onde o acesso chega. */
  emailMascarado: string;
}

export interface PlanoComPrecosDTO extends Plano {
  precos: PrecoDoPeriodo[];
}

export interface PlanosDTO {
  periodos: Periodo[];
  planos: PlanoComPrecosDTO[];
}

export interface PainelAssinaturaDTO {
  planoCodigo: string;
  planoNome: string;
  valorMensal: number;
  periodoCodigo: string;
  periodoNome: string;
  /** Valor de cada cobrança no período atual. */
  valorCiclo: number;
  /** Quanto custa renovar por cada período (o síndico pode trocar de período ao renovar). */
  opcoesRenovacao: (PrecoDoPeriodo & { nome: string; meses: number; desconto: number })[];
  limiteMoradores: number;
  moradoresAtivos: number;
  status: StatusAssinatura;
  ativaAte: Date | null;
  /** Dias até vencer (negativo = vencida). Null enquanto não houve o primeiro pagamento. */
  diasRestantes: number | null;
  cobrancaPendente: {
    invoiceUrl: string;
    valor: number;
    referencia: string;
    periodoCodigo: string;
  } | null;
}

type AssinaturaComResponsavel = Assinatura & { responsavel: User };

function mascararEmail(email: string): string {
  const [usuario, dominio] = email.split('@');
  if (!dominio) return email;
  return `${usuario.slice(0, 1)}***@${dominio}`;
}

/** Tira os hífens do começo e do fim sem regex (as de ancoragem dupla têm custo super-linear). */
function aparar(texto: string, caractere: string): string {
  let inicio = 0;
  let fim = texto.length;
  while (inicio < fim && texto[inicio] === caractere) inicio += 1;
  while (fim > inicio && texto[fim - 1] === caractere) fim -= 1;
  return texto.slice(inicio, fim);
}

function slugificar(nome: string): string {
  const semAcento = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  return aparar(semAcento, '-').slice(0, 40);
}

function gerarPin(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

/** Número do recibo: prefixo da marca + os 8 primeiros caracteres do id da cobrança (ex.: USAI-3F9A12BC). */
export function numeroDoRecibo(cobrancaId: string): string {
  return `USAI-${cobrancaId.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}

/** Mostra só o miolo do CPF/CNPJ (***.123.456-**), pra o e-mail não carregar o documento inteiro. */
export function mascararDocumento(documento: string | null | undefined): string | null {
  const digitos = (documento ?? '').replace(/\D/g, '');
  if (digitos.length === 11) {
    return `***.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-**`;
  }
  if (digitos.length === 14) {
    return `**.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-**`;
  }
  return null;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function referenciaDoMes(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Assinatura dos condomínios (SaaS). Fluxo: o síndico escolhe o plano pela quantidade de moradores
 * e o período de cobrança (mensal, trimestral, semestral ou anual, com desconto) e cadastra o
 * condomínio (fica inativo) → paga a 1ª cobrança por PIX (Asaas) →
 * confirmado o pagamento (webhook ou conferência periódica), o condomínio e a conta do síndico são
 * ativados e chega por e-mail um link de uso único pra ele criar a senha → no painel, o síndico
 * repassa o link e o PIN aos moradores. A cobrança seguinte também é por PIX (e dá pra trocar de
 * período); vencida há mais de alguns dias, o condomínio é suspenso (moradores deixam de entrar
 * até pagar).
 */
export class AssinaturasService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly asaas: AsaasClient,
    private readonly mailer: Mailer = new SmtpMailer(),
    private readonly notificacoes?: NotificacoesService,
  ) {}

  listarPlanos(): PlanosDTO {
    return {
      periodos: PERIODOS,
      planos: planosDisponiveis().map((plano) => ({ ...plano, precos: precosDoPlano(plano) })),
    };
  }

  /**
   * Cadastro público do condomínio + 1ª cobrança. Idempotente por e-mail enquanto o pagamento não
   * for confirmado: quem volta a contratar com o mesmo e-mail recebe de volta a mesma cobrança.
   */
  async contratar(input: ContratarInput): Promise<ContratacaoDTO> {
    const plano = buscarPlanoDisponivel(input.planoCodigo);
    if (!plano) {
      throw new AppError('Plano inválido', 400, 'PLANO_INVALIDO');
    }
    const periodo = buscarPeriodo(input.periodoCodigo);
    if (!periodo) {
      throw new AppError('Período de cobrança inválido', 400, 'PERIODO_INVALIDO');
    }

    const cpfCnpj = normalizarDocumento(input.cpfCnpj);

    const existente = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: {
        assinaturasContratadas: {
          where: { status: 'AGUARDANDO_PAGAMENTO' },
          include: {
            condominio: true,
            cobrancas: { where: { status: 'PENDENTE' }, orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });

    if (existente) {
      const pendente = existente.ativo ? undefined : existente.assinaturasContratadas[0];
      if (pendente?.cobrancas[0]) {
        const mudou =
          pendente.planoCodigo !== plano.codigo || pendente.periodoCodigo !== periodo.codigo;
        if (!mudou) {
          return this.paraDTO(
            pendente,
            existente.email,
            pendente.condominio.nome,
            pendente.cobrancas[0].invoiceUrl,
          );
        }
        return this.reconfigurarPendente(pendente, existente, plano, periodo);
      }
      throw new ConflictError('Já existe uma conta com este e-mail');
    }

    const docEmUso = await this.prisma.user.findFirst({ where: { cpf: cpfCnpj } });
    if (docEmUso) {
      throw new ConflictError('Já existe uma conta cadastrada com este CPF/CNPJ');
    }

    const senhaInutilizavel = await bcrypt.hash(
      crypto.randomBytes(32).toString('hex'),
      BCRYPT_ROUNDS,
    );

    const criados = await this.prisma.$transaction(async (tx) => {
      const condominio = await tx.condominio.create({
        data: {
          nome: input.nomeCondominio,
          linkSlug: await this.gerarSlugUnico(tx, input.nomeCondominio),
          pin: gerarPin(),
          ativo: false,
        },
      });
      const sindico = await tx.user.create({
        data: {
          nome: input.nomeSindico,
          email: input.email,
          senhaHash: senhaInutilizavel,
          cpf: cpfCnpj,
          papel: 'SINDICO',
          condominioId: condominio.id,
          ativo: false,
        },
      });
      const assinatura = await tx.assinatura.create({
        data: {
          condominioId: condominio.id,
          responsavelId: sindico.id,
          planoCodigo: plano.codigo,
          valorMensal: plano.valorMensal,
          limiteMoradores: plano.limiteMoradores,
          periodoCodigo: periodo.codigo,
          valorCiclo: precoDoPeriodo(plano, periodo).valorTotal,
          status: 'AGUARDANDO_PAGAMENTO',
        },
      });
      return { condominio, sindico, assinatura };
    });

    try {
      const cobranca = await this.abrirCobranca(
        criados.assinatura,
        criados.sindico,
        new Date(),
        periodo,
      );
      return this.paraDTO(
        { ...criados.assinatura, responsavel: criados.sindico },
        criados.sindico.email,
        criados.condominio.nome,
        cobranca.invoiceUrl,
      );
    } catch (error) {
      await this.desfazerContratacao(
        criados.assinatura.id,
        criados.sindico.id,
        criados.condominio.id,
      );
      throw error;
    }
  }

  /** Acompanhamento público da contratação (a tela espera a confirmação do PIX por aqui). */
  async consultarStatus(assinaturaId: string): Promise<ContratacaoDTO> {
    const assinatura = await this.prisma.assinatura.findUnique({
      where: { id: assinaturaId },
      include: {
        responsavel: true,
        condominio: true,
        cobrancas: { where: { status: 'PENDENTE' }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!assinatura) {
      throw new NotFoundError('Contratação não encontrada');
    }

    const invoiceUrl =
      assinatura.status === 'AGUARDANDO_PAGAMENTO'
        ? (assinatura.cobrancas[0]?.invoiceUrl ?? null)
        : null;

    return this.paraDTO(
      assinatura,
      assinatura.responsavel.email,
      assinatura.condominio.nome,
      invoiceUrl,
    );
  }

  /** Reenvia o e-mail com o link de criação de senha (link expirado ou e-mail perdido). */
  async reenviarAcesso(assinaturaId: string): Promise<void> {
    const assinatura = await this.prisma.assinatura.findUnique({
      where: { id: assinaturaId },
      include: { responsavel: true, condominio: true },
    });

    if (!assinatura) {
      throw new NotFoundError('Contratação não encontrada');
    }
    if (assinatura.status === 'AGUARDANDO_PAGAMENTO') {
      throw new AppError('O pagamento ainda não foi confirmado', 409, 'PAGAMENTO_PENDENTE');
    }

    const tokens = await this.prisma.tokenAcesso.findMany({
      where: { userId: assinatura.responsavelId },
      orderBy: { createdAt: 'desc' },
    });

    if (tokens.some((token) => token.usadoEm)) {
      throw new AppError(
        'O acesso já foi criado. Entre com o seu e-mail e a senha que você definiu.',
        409,
        'ACESSO_JA_CRIADO',
      );
    }
    if (tokens[0] && Date.now() - tokens[0].createdAt.getTime() < INTERVALO_MINIMO_REENVIO_MS) {
      throw new AppError(
        'Aguarde um minuto para pedir o e-mail de novo.',
        429,
        'TOO_MANY_REQUESTS',
      );
    }

    // O recibo reenviado é o do primeiro pagamento (o que liberou o acesso).
    const primeiraPaga = await this.prisma.cobrancaAssinatura.findFirst({
      where: { assinaturaId: assinatura.id, status: 'PAGO' },
      orderBy: { pagoEm: 'asc' },
    });

    await this.enviarAcesso(
      assinatura.responsavel,
      assinatura.condominio.nome,
      primeiraPaga?.pagoEm
        ? this.montarDetalhes({
            planoCodigo: assinatura.planoCodigo,
            cobranca: primeiraPaga,
            pagador: assinatura.responsavel,
            pagoEm: primeiraPaga.pagoEm,
            ativaAte: new Date(primeiraPaga.pagoEm.getTime() + primeiraPaga.dias * MS_POR_DIA),
          })
        : undefined,
    );
  }

  /** Painel do síndico: plano, uso (moradores x limite), vencimento e cobrança em aberto. */
  async obterPainel(condominioId: string): Promise<PainelAssinaturaDTO | null> {
    const assinatura = await this.prisma.assinatura.findUnique({
      where: { condominioId },
      include: {
        cobrancas: { where: { status: 'PENDENTE' }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    // Condomínios cadastrados pelo Admin antes dos planos não têm assinatura nem limite.
    if (!assinatura) return null;

    const moradoresAtivos = await this.prisma.user.count({
      where: { condominioId, papel: 'MORADOR', ativo: true },
    });
    const pendente = assinatura.cobrancas[0];

    return {
      planoCodigo: assinatura.planoCodigo,
      planoNome: buscarPlano(assinatura.planoCodigo)?.nome ?? assinatura.planoCodigo,
      valorMensal: Number(assinatura.valorMensal),
      periodoCodigo: assinatura.periodoCodigo,
      periodoNome: buscarPeriodo(assinatura.periodoCodigo)?.nome ?? assinatura.periodoCodigo,
      valorCiclo: Number(assinatura.valorCiclo),
      // O preço contratado vale nas renovações, mesmo que a tabela de planos mude depois.
      opcoesRenovacao: PERIODOS.map((periodo) => ({
        ...precoDoPeriodo({ valorMensal: Number(assinatura.valorMensal) }, periodo),
        nome: periodo.nome,
        meses: periodo.meses,
        desconto: periodo.desconto,
      })),
      limiteMoradores: assinatura.limiteMoradores,
      moradoresAtivos,
      status: assinatura.status as StatusAssinatura,
      ativaAte: assinatura.ativaAte,
      diasRestantes: assinatura.ativaAte
        ? Math.ceil((assinatura.ativaAte.getTime() - Date.now()) / MS_POR_DIA)
        : null,
      cobrancaPendente: pendente
        ? {
            invoiceUrl: pendente.invoiceUrl,
            valor: Number(pendente.valor),
            referencia: pendente.referencia,
            periodoCodigo: pendente.periodoCodigo,
          }
        : null,
    };
  }

  /**
   * Síndico gera o PIX da renovação. Pode trocar de período (ex.: de mensal pra anual), a cobrança
   * em aberto de outro período é cancelada. Pedir o mesmo período de novo devolve a que já existe.
   */
  async gerarCobrancaRenovacao(
    condominioId: string,
    periodoCodigo?: string,
  ): Promise<{ invoiceUrl: string }> {
    const assinatura = await this.prisma.assinatura.findUnique({
      where: { condominioId },
      include: {
        responsavel: true,
        cobrancas: { where: { status: 'PENDENTE' }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!assinatura) {
      throw new NotFoundError('Este condomínio não tem assinatura');
    }

    const periodo = buscarPeriodo(periodoCodigo ?? assinatura.periodoCodigo);
    if (!periodo) {
      throw new AppError('Período de cobrança inválido', 400, 'PERIODO_INVALIDO');
    }

    const pendente = assinatura.cobrancas[0];
    if (pendente && pendente.periodoCodigo === periodo.codigo) {
      return { invoiceUrl: pendente.invoiceUrl };
    }
    if (assinatura.status === 'AGUARDANDO_PAGAMENTO') {
      throw new AppError('A primeira cobrança ainda não foi gerada', 409, 'SEM_COBRANCA');
    }
    if (pendente) {
      await this.cancelarCobranca(pendente);
    }

    // A referência é o mês em que o período pago começa a valer.
    const inicioDoPeriodo =
      assinatura.ativaAte && assinatura.ativaAte > new Date() ? assinatura.ativaAte : new Date();
    const cobranca = await this.abrirCobranca(
      assinatura,
      assinatura.responsavel,
      inicioDoPeriodo,
      periodo,
    );
    return { invoiceUrl: cobranca.invoiceUrl };
  }

  /**
   * Chamado pelo webhook do Asaas e pela conferência periódica quando um PIX é pago.
   * Retorna `false` se a cobrança não é de uma assinatura (aí é uma locação e quem trata é o
   * `PagamentosService`). Idempotente: reentrega do mesmo evento não ativa nem soma período duas vezes.
   *
   * Só ativa o condomínio e envia o e-mail (com o recibo) quando o dinheiro **caiu na conta**
   * (`recebido`, evento PAYMENT_RECEIVED). Uma confirmação sem o dinheiro (PAYMENT_CONFIRMED) é
   * reconhecida, mas fica esperando o recebimento.
   */
  async confirmarCobranca(asaasChargeId: string, recebido = true): Promise<boolean> {
    const cobranca = await this.prisma.cobrancaAssinatura.findUnique({ where: { asaasChargeId } });
    if (!cobranca) return false;

    if (!recebido) {
      logger.info('Mensalidade confirmada pelo Asaas, mas o dinheiro ainda não foi recebido', {
        asaasChargeId,
      });
      return true;
    }

    const pagoEm = new Date();

    const resultado = await this.prisma.$transaction(async (tx) => {
      const virou = await tx.cobrancaAssinatura.updateMany({
        where: { id: cobranca.id, status: 'PENDENTE' },
        data: { status: 'PAGO', pagoEm },
      });
      if (virou.count === 0) return null;

      const assinatura = await tx.assinatura.findUniqueOrThrow({
        where: { id: cobranca.assinaturaId },
        include: { responsavel: true, condominio: true },
      });

      const primeiroPagamento = assinatura.status === 'AGUARDANDO_PAGAMENTO';
      const agora = new Date();
      const base = assinatura.ativaAte && assinatura.ativaAte > agora ? assinatura.ativaAte : agora;
      const ativaAte = new Date(base.getTime() + cobranca.dias * MS_POR_DIA);

      await tx.assinatura.update({
        where: { id: assinatura.id },
        data: {
          status: 'ATIVA',
          ativaAte,
          periodoCodigo: cobranca.periodoCodigo,
          valorCiclo: cobranca.valor,
        },
      });
      await tx.condominio.update({ where: { id: assinatura.condominioId }, data: { ativo: true } });
      if (primeiroPagamento) {
        await tx.user.update({ where: { id: assinatura.responsavelId }, data: { ativo: true } });
      }

      return { assinatura, primeiroPagamento, ativaAte };
    });

    if (!resultado) return true;

    const { assinatura, primeiroPagamento, ativaAte } = resultado;

    if (primeiroPagamento) {
      try {
        await this.enviarAcesso(
          assinatura.responsavel,
          assinatura.condominio.nome,
          this.montarDetalhes({
            planoCodigo: assinatura.planoCodigo,
            cobranca,
            pagador: assinatura.responsavel,
            pagoEm,
            ativaAte,
          }),
        );
      } catch (error) {
        // O condomínio já está ativo; o síndico pode pedir o e-mail de novo pela tela de acompanhamento.
        logger.error('Falha ao enviar o e-mail de acesso do síndico', {
          error,
          assinaturaId: assinatura.id,
        });
      }
    } else {
      await this.notificacoes?.notificar({
        userId: assinatura.responsavelId,
        tipo: 'ASSINATURA_RENOVADA',
        titulo: 'Pagamento da assinatura confirmado',
        mensagem: `Recebemos o pagamento. Seu condomínio está ativo até ${ativaAte.toLocaleDateString('pt-BR')}.`,
        link: '/sindico',
      });
    }

    return true;
  }

  /** Rede de segurança do webhook: pergunta ao Asaas pelas mensalidades ainda pendentes. */
  async conferirPendentes(): Promise<number> {
    const desde = new Date(Date.now() - JANELA_CONFERENCIA_DIAS * MS_POR_DIA);
    const pendentes = await this.prisma.cobrancaAssinatura.findMany({
      where: { status: 'PENDENTE', createdAt: { gte: desde } },
      orderBy: { createdAt: 'asc' },
      take: LIMITE_CONFERENCIA,
    });

    let confirmadas = 0;
    for (const cobranca of pendentes) {
      try {
        const noAsaas = await this.asaas.buscarCobranca(cobranca.asaasChargeId);
        // RECEIVED = o dinheiro caiu na conta. CONFIRMED (autorizado, ainda não liquidado) não basta.
        if (noAsaas.status === 'RECEIVED') {
          await this.confirmarCobranca(cobranca.asaasChargeId);
          confirmadas += 1;
        }
      } catch (error) {
        logger.error('Falha ao conferir mensalidade no Asaas', {
          error,
          chargeId: cobranca.asaasChargeId,
        });
      }
    }
    return confirmadas;
  }

  /** Suspende as assinaturas vencidas além da carência: o condomínio fica inativo até o próximo PIX. */
  async suspenderVencidas(): Promise<number> {
    const limite = new Date(Date.now() - DIAS_DE_CARENCIA * MS_POR_DIA);
    const vencidas = await this.prisma.assinatura.findMany({
      where: { status: 'ATIVA', ativaAte: { lt: limite } },
    });

    for (const assinatura of vencidas) {
      await this.prisma.$transaction([
        this.prisma.assinatura.update({
          where: { id: assinatura.id },
          data: { status: 'SUSPENSA' },
        }),
        this.prisma.condominio.update({
          where: { id: assinatura.condominioId },
          data: { ativo: false },
        }),
      ]);
      await this.notificacoes?.notificar({
        userId: assinatura.responsavelId,
        tipo: 'ASSINATURA_SUSPENSA',
        titulo: 'Assinatura suspensa',
        mensagem:
          'A mensalidade venceu e o acesso dos moradores foi suspenso. Pague o PIX da mensalidade para reativar.',
        link: '/sindico',
      });
    }
    return vencidas.length;
  }

  private async abrirCobranca(
    assinatura: Assinatura,
    responsavel: User,
    inicioDoPeriodo: Date,
    periodo: Periodo,
  ): Promise<CobrancaAssinatura> {
    let customerId = responsavel.asaasCustomerId;
    if (!customerId) {
      const cliente = await this.asaas.criarCliente({
        nome: responsavel.nome,
        cpfCnpj: responsavel.cpf ?? '',
        email: responsavel.email,
      });
      customerId = cliente.id;
      await this.prisma.user.update({
        where: { id: responsavel.id },
        data: { asaasCustomerId: customerId },
      });
    }

    const plano = buscarPlano(assinatura.planoCodigo);
    const referencia = referenciaDoMes(inicioDoPeriodo);
    const vencimento = new Date(Date.now() + DIAS_ATE_VENCIMENTO_COBRANCA * MS_POR_DIA);
    const { valorTotal } = precoDoPeriodo({ valorMensal: Number(assinatura.valorMensal) }, periodo);

    const noAsaas = await this.asaas.criarCobrancaPix({
      customerId,
      valor: valorTotal,
      vencimento,
      externalReference: `assinatura:${assinatura.id}`,
      descricao: `Plano ${plano?.nome ?? assinatura.planoCodigo} da USAI, ${periodo.nome.toLowerCase()} (${referencia})`,
    });

    return this.prisma.cobrancaAssinatura.create({
      data: {
        assinaturaId: assinatura.id,
        asaasChargeId: noAsaas.id,
        invoiceUrl: noAsaas.invoiceUrl,
        valor: valorTotal,
        periodoCodigo: periodo.codigo,
        dias: periodo.dias,
        status: 'PENDENTE',
        referencia,
      },
    });
  }

  /** Cancela uma cobrança em aberto (aqui e, se der, no Asaas, o cancelamento lá é best-effort). */
  private async cancelarCobranca(cobranca: CobrancaAssinatura): Promise<void> {
    await this.prisma.cobrancaAssinatura.updateMany({
      where: { id: cobranca.id, status: 'PENDENTE' },
      data: { status: 'CANCELADO' },
    });
    await this.asaas.cancelarCobranca(cobranca.asaasChargeId);
  }

  /**
   * O síndico voltou à contratação (antes de pagar) escolhendo outro plano ou período: atualiza a
   * assinatura, cancela o PIX antigo e abre um novo com o valor certo.
   */
  private async reconfigurarPendente(
    pendente: Assinatura & { condominio: { nome: string }; cobrancas: CobrancaAssinatura[] },
    sindico: User,
    plano: Plano,
    periodo: Periodo,
  ): Promise<ContratacaoDTO> {
    const atualizada = await this.prisma.assinatura.update({
      where: { id: pendente.id },
      data: {
        planoCodigo: plano.codigo,
        valorMensal: plano.valorMensal,
        limiteMoradores: plano.limiteMoradores,
        periodoCodigo: periodo.codigo,
        valorCiclo: precoDoPeriodo(plano, periodo).valorTotal,
      },
    });

    await this.cancelarCobranca(pendente.cobrancas[0]);

    const cobranca = await this.abrirCobranca(atualizada, sindico, new Date(), periodo);
    return this.paraDTO(atualizada, sindico.email, pendente.condominio.nome, cobranca.invoiceUrl);
  }

  /** Monta o que o e-mail mostra: o recibo do pagamento recebido e o resumo da contratação. */
  private montarDetalhes(dados: {
    planoCodigo: string;
    cobranca: CobrancaAssinatura;
    pagador: User;
    pagoEm: Date;
    ativaAte: Date;
  }): DetalhesContratacao {
    const { cobranca, pagador, pagoEm, ativaAte } = dados;

    return {
      plano: buscarPlano(dados.planoCodigo)?.nome ?? dados.planoCodigo,
      periodo: buscarPeriodo(cobranca.periodoCodigo)?.nome ?? cobranca.periodoCodigo,
      valor: Number(cobranca.valor),
      ativaAte,
      recibo: {
        numero: numeroDoRecibo(cobranca.id),
        pagoEm,
        forma: 'PIX',
        pagador: pagador.nome,
        documento: mascararDocumento(pagador.cpf),
        vigenciaInicio: new Date(ativaAte.getTime() - cobranca.dias * MS_POR_DIA),
        comprovanteUrl: cobranca.invoiceUrl,
      },
    };
  }

  /** Gera o link de uso único (só o hash fica no banco) e envia por e-mail. */
  private async enviarAcesso(
    sindico: User,
    nomeCondominio: string,
    detalhes?: DetalhesContratacao,
  ): Promise<void> {
    const token = crypto.randomBytes(32).toString('base64url');

    // O link não tem prazo e um reenvio NÃO derruba os anteriores: qualquer e-mail enviado funciona
    // até o síndico criar a senha (aí `definirSenha` invalida todos de uma vez).
    await this.prisma.tokenAcesso.create({
      data: { userId: sindico.id, tokenHash: hashToken(token), expiraEm: null },
    });

    await this.mailer.enviar(
      emailAcessoSindico({
        para: sindico.email,
        nomeSindico: sindico.nome,
        nomeCondominio,
        link: `${urlDoApp()}/definir-senha?token=${encodeURIComponent(token)}`,
        detalhes,
      }),
    );
  }

  private async gerarSlugUnico(tx: Prisma.TransactionClient, nome: string): Promise<string> {
    const base = slugificar(nome) || 'condominio';
    for (let tentativa = 0; tentativa < 5; tentativa += 1) {
      const slug = `${base}-${crypto.randomBytes(2).toString('hex')}`;
      const existente = await tx.condominio.findUnique({ where: { linkSlug: slug } });
      if (!existente) return slug;
    }
    throw new AppError('Não foi possível gerar o link do condomínio. Tente de novo.', 500, 'SLUG');
  }

  /** O Asaas falhou depois de gravarmos o cadastro: apaga tudo pra não deixar condomínio pendente órfão. */
  private async desfazerContratacao(
    assinaturaId: string,
    sindicoId: string,
    condominioId: string,
  ): Promise<void> {
    try {
      await this.prisma.$transaction([
        this.prisma.assinatura.delete({ where: { id: assinaturaId } }),
        this.prisma.user.delete({ where: { id: sindicoId } }),
        this.prisma.condominio.delete({ where: { id: condominioId } }),
      ]);
    } catch (error) {
      logger.error('Falha ao desfazer contratação após erro no Asaas', { error, assinaturaId });
    }
  }

  private paraDTO(
    assinatura: AssinaturaComResponsavel | Assinatura,
    email: string,
    nomeCondominio: string,
    invoiceUrl: string | null,
  ): ContratacaoDTO {
    const plano = buscarPlano(assinatura.planoCodigo);
    const periodo = buscarPeriodo(assinatura.periodoCodigo) ?? PERIODOS[0];
    return {
      assinaturaId: assinatura.id,
      status: assinatura.status as StatusAssinatura,
      plano: {
        codigo: assinatura.planoCodigo,
        nome: plano?.nome ?? assinatura.planoCodigo,
        valorMensal: Number(assinatura.valorMensal),
        limiteMoradores: assinatura.limiteMoradores,
      },
      periodo: {
        codigo: periodo.codigo,
        nome: periodo.nome,
        meses: periodo.meses,
        desconto: periodo.desconto,
      },
      valorCiclo: Number(assinatura.valorCiclo),
      nomeCondominio,
      invoiceUrl,
      emailMascarado: mascararEmail(email),
    };
  }
}
