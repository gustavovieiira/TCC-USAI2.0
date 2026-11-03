import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Assinatura, CobrancaAssinatura, Prisma, PrismaClient, User } from '@prisma/client';
import { AppError, ConflictError, NotFoundError } from '@/common/errors';
import { normalizarDocumento } from '@/common/documento';
import { logger } from '@/common/logger';
import { Mailer, SmtpMailer, urlDoApp } from '@/common/mailer';
import { BCRYPT_ROUNDS } from '@/modules/auth/auth.service';
import { NotificacoesService } from '@/modules/notificacoes/notificacoes.service';
import { AsaasClient, STATUS_ASAAS_PAGO } from '@/modules/pagamentos/asaas.client';
import { emailAcessoSindico, HORAS_VALIDADE_ACESSO } from './assinaturas.emails';
import { buscarPlano, Plano, PLANOS } from './planos';

const MS_POR_DIA = 24 * 60 * 60 * 1000;
/** Quanto cada mensalidade paga mantém o condomínio ativo. */
const DIAS_POR_MENSALIDADE = 30;
/** Dias de tolerância depois do vencimento antes de suspender o condomínio. */
const DIAS_DE_CARENCIA = 5;
const DIAS_ATE_VENCIMENTO_COBRANCA = 7;
const JANELA_CONFERENCIA_DIAS = 14;
const LIMITE_CONFERENCIA = 100;
const INTERVALO_MINIMO_REENVIO_MS = 60 * 1000;

export type StatusAssinatura = 'AGUARDANDO_PAGAMENTO' | 'ATIVA' | 'SUSPENSA';

export interface ContratarInput {
  planoCodigo: string;
  nomeCondominio: string;
  nomeSindico: string;
  email: string;
  cpfCnpj: string;
}

export interface ContratacaoDTO {
  assinaturaId: string;
  status: StatusAssinatura;
  plano: Pick<Plano, 'codigo' | 'nome' | 'valorMensal' | 'limiteMoradores'>;
  nomeCondominio: string;
  /** Link do PIX pra pagar; só existe enquanto o pagamento não foi confirmado. */
  invoiceUrl: string | null;
  /** E-mail do síndico com parte escondida (ex.: g***@dominio.com), pra mostrar onde o acesso chega. */
  emailMascarado: string;
}

export interface PainelAssinaturaDTO {
  planoCodigo: string;
  planoNome: string;
  valorMensal: number;
  limiteMoradores: number;
  moradoresAtivos: number;
  status: StatusAssinatura;
  ativaAte: Date | null;
  /** Dias até vencer (negativo = vencida). Null enquanto não houve o primeiro pagamento. */
  diasRestantes: number | null;
  cobrancaPendente: { invoiceUrl: string; valor: number; referencia: string } | null;
}

type AssinaturaComResponsavel = Assinatura & { responsavel: User };

function mascararEmail(email: string): string {
  const [usuario, dominio] = email.split('@');
  if (!dominio) return email;
  return `${usuario.slice(0, 1)}***@${dominio}`;
}

function slugificar(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function gerarPin(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function referenciaDoMes(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Assinatura mensal dos condomínios (SaaS). Fluxo: o síndico escolhe o plano pela quantidade de
 * moradores e cadastra o condomínio (fica inativo) → paga a 1ª mensalidade por PIX (Asaas) →
 * confirmado o pagamento (webhook ou conferência periódica), o condomínio e a conta do síndico são
 * ativados e chega por e-mail um link de uso único pra ele criar a senha → no painel, o síndico
 * repassa o link e o PIN aos moradores. A mensalidade seguinte é cobrada por PIX; vencida há mais
 * de alguns dias, o condomínio é suspenso (moradores deixam de entrar até pagar).
 */
export class AssinaturasService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly asaas: AsaasClient,
    private readonly mailer: Mailer = new SmtpMailer(),
    private readonly notificacoes?: NotificacoesService,
  ) {}

  listarPlanos(): Plano[] {
    return PLANOS;
  }

  /**
   * Cadastro público do condomínio + 1ª cobrança. Idempotente por e-mail enquanto o pagamento não
   * for confirmado: quem volta a contratar com o mesmo e-mail recebe de volta a mesma cobrança.
   */
  async contratar(input: ContratarInput): Promise<ContratacaoDTO> {
    const plano = buscarPlano(input.planoCodigo);
    if (!plano) {
      throw new AppError('Plano inválido', 400, 'PLANO_INVALIDO');
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
        return this.paraDTO(
          pendente,
          existente.email,
          pendente.condominio.nome,
          pendente.cobrancas[0].invoiceUrl,
        );
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
          status: 'AGUARDANDO_PAGAMENTO',
        },
      });
      return { condominio, sindico, assinatura };
    });

    try {
      const cobranca = await this.abrirCobranca(criados.assinatura, criados.sindico, new Date());
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

    await this.enviarAcesso(assinatura.responsavel, assinatura.condominio.nome);
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
          }
        : null,
    };
  }

  /** Síndico gera (ou recupera, se já existe uma em aberto) o PIX da próxima mensalidade. */
  async gerarCobrancaMensalidade(condominioId: string): Promise<{ invoiceUrl: string }> {
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
    if (assinatura.cobrancas[0]) {
      return { invoiceUrl: assinatura.cobrancas[0].invoiceUrl };
    }
    if (assinatura.status === 'AGUARDANDO_PAGAMENTO') {
      throw new AppError('A primeira cobrança ainda não foi gerada', 409, 'SEM_COBRANCA');
    }

    // A referência é o mês que esta mensalidade passa a cobrir.
    const inicioDoPeriodo =
      assinatura.ativaAte && assinatura.ativaAte > new Date() ? assinatura.ativaAte : new Date();
    const cobranca = await this.abrirCobranca(assinatura, assinatura.responsavel, inicioDoPeriodo);
    return { invoiceUrl: cobranca.invoiceUrl };
  }

  /**
   * Chamado pelo webhook do Asaas e pela conferência periódica quando um PIX é confirmado.
   * Retorna `false` se a cobrança não é de uma assinatura (aí é uma locação e quem trata é o
   * `PagamentosService`). Idempotente: reentrega do mesmo evento não ativa nem soma período duas vezes.
   */
  async confirmarCobranca(asaasChargeId: string): Promise<boolean> {
    const cobranca = await this.prisma.cobrancaAssinatura.findUnique({ where: { asaasChargeId } });
    if (!cobranca) return false;

    const resultado = await this.prisma.$transaction(async (tx) => {
      const virou = await tx.cobrancaAssinatura.updateMany({
        where: { id: cobranca.id, status: 'PENDENTE' },
        data: { status: 'PAGO', pagoEm: new Date() },
      });
      if (virou.count === 0) return null;

      const assinatura = await tx.assinatura.findUniqueOrThrow({
        where: { id: cobranca.assinaturaId },
        include: { responsavel: true, condominio: true },
      });

      const primeiroPagamento = assinatura.status === 'AGUARDANDO_PAGAMENTO';
      const agora = new Date();
      const base = assinatura.ativaAte && assinatura.ativaAte > agora ? assinatura.ativaAte : agora;
      const ativaAte = new Date(base.getTime() + DIAS_POR_MENSALIDADE * MS_POR_DIA);

      await tx.assinatura.update({
        where: { id: assinatura.id },
        data: { status: 'ATIVA', ativaAte },
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
        await this.enviarAcesso(assinatura.responsavel, assinatura.condominio.nome);
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
        titulo: 'Mensalidade confirmada',
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
        if (STATUS_ASAAS_PAGO.includes(noAsaas.status)) {
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

    const noAsaas = await this.asaas.criarCobrancaPix({
      customerId,
      valor: Number(assinatura.valorMensal),
      vencimento,
      externalReference: `assinatura:${assinatura.id}`,
      descricao: `USAI — plano ${plano?.nome ?? assinatura.planoCodigo} (${referencia})`,
    });

    return this.prisma.cobrancaAssinatura.create({
      data: {
        assinaturaId: assinatura.id,
        asaasChargeId: noAsaas.id,
        invoiceUrl: noAsaas.invoiceUrl,
        valor: assinatura.valorMensal,
        status: 'PENDENTE',
        referencia,
      },
    });
  }

  /** Gera o link de uso único (só o hash fica no banco) e envia por e-mail. */
  private async enviarAcesso(sindico: User, nomeCondominio: string): Promise<void> {
    const token = crypto.randomBytes(32).toString('base64url');

    // Um link novo invalida os anteriores ainda não usados.
    await this.prisma.tokenAcesso.updateMany({
      where: { userId: sindico.id, usadoEm: null },
      data: { expiraEm: new Date() },
    });
    await this.prisma.tokenAcesso.create({
      data: {
        userId: sindico.id,
        tokenHash: hashToken(token),
        expiraEm: new Date(Date.now() + HORAS_VALIDADE_ACESSO * 60 * 60 * 1000),
      },
    });

    await this.mailer.enviar(
      emailAcessoSindico({
        para: sindico.email,
        nomeSindico: sindico.nome,
        nomeCondominio,
        link: `${urlDoApp()}/definir-senha?token=${encodeURIComponent(token)}`,
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
    return {
      assinaturaId: assinatura.id,
      status: assinatura.status as StatusAssinatura,
      plano: {
        codigo: assinatura.planoCodigo,
        nome: plano?.nome ?? assinatura.planoCodigo,
        valorMensal: Number(assinatura.valorMensal),
        limiteMoradores: assinatura.limiteMoradores,
      },
      nomeCondominio,
      invoiceUrl,
      emailMascarado: mascararEmail(email),
    };
  }
}
