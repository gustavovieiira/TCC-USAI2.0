import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AppError, ConflictError, NotFoundError, UnauthorizedError } from '@/common/errors';
import { segredosJwt, iguaisEmTempoConstante } from '@/common/config';
import { logger } from '@/common/logger';
import { VERSAO_TERMOS } from '@/common/termos';
import { Mailer, SmtpMailer, urlDoApp } from '@/common/mailer';
import { emailRedefinicaoSenha } from './auth.emails';
import {
  AtualizarPerfilInput,
  AuthResult,
  AuthTokens,
  AuthenticatedUser,
  CadastroMoradorInput,
  LoginInput,
} from './auth.types';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
/** Reaproveitado pelo Admin USAI ao criar contas de síndico (`admin.service.ts`). */
export const BCRYPT_ROUNDS = 10;

/**
 * Hash de uma senha que ninguém usa. No login de um e-mail que não existe, a senha é comparada com ele
 * mesmo assim, para a resposta demorar o mesmo tempo e não revelar quais e-mails têm conta.
 */
let hashFalso: Promise<string> | undefined;
function obterHashFalso(): Promise<string> {
  hashFalso ??= bcrypt.hash('senha-que-ninguem-usa', BCRYPT_ROUNDS);
  return hashFalso;
}

/** Tamanho do código do link de acesso: 32 bytes aleatórios em base64url, sem preenchimento. */
export const TAMANHO_TOKEN_ACESSO = 43;

/** Tipos de link guardados em `tokens_acesso`. */
const TIPO_ACESSO = 'ACESSO';
const TIPO_REDEFINICAO = 'REDEFINICAO';
/** Quanto tempo vale o link do "Esqueci minha senha". */
export const VALIDADE_REDEFINICAO_MIN = 60;
/** Intervalo mínimo entre dois pedidos de redefinição da mesma conta (evita encher a caixa de e-mail). */
const INTERVALO_REDEFINICAO_MS = 60 * 1000;

const SENHA_JA_CRIADA =
  'A sua senha já foi criada. Entre pela página "Entrar", com o seu e-mail e a senha que você definiu.';

function toAuthenticatedUser(user: {
  id: string;
  nome: string;
  email: string;
  papel: AuthenticatedUser['papel'];
  condominioId: string | null;
  apartamento?: string | null;
  cpf?: string | null;
}): AuthenticatedUser {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    papel: user.papel,
    condominioId: user.condominioId,
    apartamento: user.apartamento ?? null,
    cpf: user.cpf ?? null,
  };
}

/** Mantém só os dígitos, aceita o CPF com ou sem pontuação (Asaas exige só números). */
function normalizarCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly mailer: Mailer = new SmtpMailer(),
  ) {}

  private getSecrets() {
    return segredosJwt();
  }

  /**
   * `versao` é o `tokenVersion` da conta: o refresh token guarda esse número (`v`) e só vale enquanto
   * ele não mudar. Sair da conta e trocar a senha aumentam o número, o que derruba todas as sessões.
   */
  private issueTokens(user: AuthenticatedUser, versao = 0): AuthTokens {
    const { accessSecret, refreshSecret } = this.getSecrets();
    const payload = { userId: user.id, papel: user.papel, condominioId: user.condominioId };

    const accessToken = jwt.sign(payload, accessSecret, {
      expiresIn: ACCESS_TOKEN_TTL,
      algorithm: 'HS256',
    });
    const refreshToken = jwt.sign({ ...payload, v: versao }, refreshSecret, {
      expiresIn: REFRESH_TOKEN_TTL,
      algorithm: 'HS256',
    });

    return { accessToken, refreshToken };
  }

  /**
   * RF01/RF02/RN03, cadastro do morador via link exclusivo + PIN do condomínio.
   * O PIN é validado apenas neste momento; não é reutilizado depois do vínculo criado.
   */
  async cadastrarMorador(input: CadastroMoradorInput): Promise<AuthResult> {
    const condominio = await this.prisma.condominio.findUnique({
      where: { linkSlug: input.linkSlug },
      include: { assinatura: true },
    });

    if (!condominio || !condominio.ativo) {
      throw new NotFoundError('Condomínio não encontrado ou inativo');
    }

    if (!iguaisEmTempoConstante(condominio.pin, input.pin)) {
      throw new AppError('PIN inválido para este condomínio', 401, 'INVALID_PIN');
    }

    // Condomínios com assinatura têm limite de moradores ativos (o do plano contratado).
    if (condominio.assinatura) {
      const moradoresAtivos = await this.prisma.user.count({
        where: { condominioId: condominio.id, papel: 'MORADOR', ativo: true },
      });
      if (moradoresAtivos >= condominio.assinatura.limiteMoradores) {
        throw new AppError(
          'Este condomínio atingiu o limite de moradores do plano. Fale com o síndico.',
          409,
          'LIMITE_MORADORES',
        );
      }
    }

    const existente = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existente) {
      throw new ConflictError('Já existe uma conta com este e-mail');
    }

    const senhaHash = await bcrypt.hash(input.senha, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        nome: input.nome,
        email: input.email,
        senhaHash,
        apartamento: input.apartamento,
        condominioId: condominio.id,
        papel: 'MORADOR',
        aceitouTermosEm: new Date(),
        versaoTermos: VERSAO_TERMOS,
      },
    });

    const authenticatedUser = toAuthenticatedUser(user);
    return { ...this.issueTokens(authenticatedUser, user.tokenVersion), user: authenticatedUser };
  }

  /** RF03, login com e-mail e senha, válido para todos os perfis. */
  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { condominio: { include: { assinatura: true } } },
    });
    if (!user) {
      await bcrypt.compare(input.senha, await obterHashFalso());
      throw new UnauthorizedError('Credenciais inválidas');
    }

    const senhaValida = await bcrypt.compare(input.senha, user.senhaHash);
    if (!senhaValida) {
      throw new UnauthorizedError('Credenciais inválidas');
    }

    if (!user.ativo) {
      throw new UnauthorizedError('Esta conta foi desativada pelo síndico do condomínio');
    }

    this.garantirCondominioEmDia(user);

    const authenticatedUser = toAuthenticatedUser(user);
    return { ...this.issueTokens(authenticatedUser, user.tokenVersion), user: authenticatedUser };
  }

  /** Sair da conta: derruba as sessões abertas (os refresh tokens deixam de valer em todos os aparelhos). */
  async encerrarSessoes(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  /**
   * Morador/síndico/admin edita os próprios dados: nome, apartamento e CPF (necessário pro
   * locatário pagar uma locação via Asaas, M3). CPF fica de fora do update quando não enviado,
   * pra não apagar um valor já cadastrado.
   */
  async atualizarPerfil(userId: string, input: AtualizarPerfilInput): Promise<AuthenticatedUser> {
    let cpf: string | undefined;

    if (input.cpf !== undefined) {
      cpf = normalizarCpf(input.cpf);

      if (cpf.length !== 11) {
        throw new AppError('CPF inválido: deve ter 11 dígitos', 400, 'CPF_INVALIDO');
      }

      const existente = await this.prisma.user.findFirst({
        where: { cpf, id: { not: userId } },
      });
      if (existente) {
        throw new ConflictError('Já existe uma conta cadastrada com este CPF');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { nome: input.nome, apartamento: input.apartamento, cpf },
    });

    return toAuthenticatedUser(user);
  }

  /**
   * Link do e-mail de acesso (enviado ao síndico quando o PIX é confirmado): define a primeira
   * senha e já entra. O link vale até a senha ser criada (sem prazo), mesmo que o e-mail tenha sido
   * reenviado; ao criar a senha, TODOS os links do síndico deixam de valer. Só o hash do token existe
   * no banco.
   */
  async definirSenha(token: string, senha: string): Promise<AuthResult> {
    // Um link com tamanho errado foi cortado ao ser copiado (ou digitado à mão): dizer isso é bem mais
    // útil do que um "link inválido" genérico.
    if (token.length !== TAMANHO_TOKEN_ACESSO) {
      logger.warn('Link de acesso com tamanho errado (provavelmente cortado ao copiar)', {
        tamanho: token.length,
      });
      throw new AppError(
        'Este link parece estar incompleto: ele foi cortado ao ser copiado. Abra-o direto pelo botão do e-mail (no mesmo aparelho em que o endereço funciona) ou peça outro e-mail na página de acompanhamento da contratação.',
        400,
        'TOKEN_INCOMPLETO',
      );
    }

    const registro = await this.prisma.tokenAcesso.findUnique({
      where: { tokenHash: crypto.createHash('sha256').update(token).digest('hex') },
      include: { user: true },
    });

    if (!registro) {
      throw new AppError(
        'Este link não é válido. Peça outro e-mail na página de acompanhamento da contratação.',
        400,
        'TOKEN_INVALIDO',
      );
    }

    // Link de redefinição de senha não serve para o primeiro acesso (e vice-versa).
    if (registro.tipo !== TIPO_ACESSO) {
      throw new AppError(
        'Este link não é válido. Peça outro e-mail na página de acompanhamento da contratação.',
        400,
        'TOKEN_INVALIDO',
      );
    }

    if (registro.usadoEm) {
      throw new AppError(SENHA_JA_CRIADA, 400, 'SENHA_JA_CRIADA');
    }

    // Links antigos (de antes de passarem a valer sem prazo) ainda podem trazer uma validade.
    if (registro.expiraEm && registro.expiraEm < new Date()) {
      throw new AppError(
        'Este link expirou. Peça outro e-mail na página de acompanhamento da contratação.',
        400,
        'TOKEN_INVALIDO',
      );
    }

    if (!registro.user.ativo) {
      throw new UnauthorizedError('Esta conta ainda não está ativa');
    }

    const senhaHash = await bcrypt.hash(senha, BCRYPT_ROUNDS);
    const user = await this.prisma.$transaction(async (tx) => {
      // Marca como usado só se ainda não foi (duas abas com o mesmo link: a segunda falha).
      const marcado = await tx.tokenAcesso.updateMany({
        where: { id: registro.id, usadoEm: null },
        data: { usadoEm: new Date() },
      });
      if (marcado.count === 0) return null;

      // Senha criada: os outros links enviados por e-mail deixam de valer (o acesso agora é por login).
      await tx.tokenAcesso.updateMany({
        where: { userId: registro.userId, usadoEm: null },
        data: { usadoEm: new Date() },
      });
      return tx.user.update({ where: { id: registro.userId }, data: { senhaHash } });
    });

    if (!user) {
      throw new AppError(SENHA_JA_CRIADA, 400, 'SENHA_JA_CRIADA');
    }

    const authenticatedUser = toAuthenticatedUser(user);
    return { ...this.issueTokens(authenticatedUser, user.tokenVersion), user: authenticatedUser };
  }

  /**
   * "Esqueci minha senha": se o e-mail for de uma conta ativa, envia um link para escolher uma senha
   * nova (vale 1 hora, uso único). Não devolve nada de propósito: quem chama responde sempre a mesma
   * coisa, exista a conta ou não, para ninguém descobrir quais e-mails estão cadastrados.
   */
  async solicitarRedefinicaoSenha(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.ativo) return;

    const recente = await this.prisma.tokenAcesso.findFirst({
      where: {
        userId: user.id,
        tipo: TIPO_REDEFINICAO,
        createdAt: { gt: new Date(Date.now() - INTERVALO_REDEFINICAO_MS) },
      },
    });
    if (recente) return;

    const token = crypto.randomBytes(32).toString('base64url');
    await this.prisma.tokenAcesso.create({
      data: {
        userId: user.id,
        tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
        tipo: TIPO_REDEFINICAO,
        expiraEm: new Date(Date.now() + VALIDADE_REDEFINICAO_MIN * 60 * 1000),
      },
    });

    await this.mailer.enviar(
      emailRedefinicaoSenha({
        para: user.email,
        nome: user.nome,
        link: `${urlDoApp()}/redefinir-senha?token=${encodeURIComponent(token)}`,
        validadeMinutos: VALIDADE_REDEFINICAO_MIN,
      }),
    );
  }

  /**
   * Conclui o "Esqueci minha senha": troca a senha com o link recebido por e-mail. Não faz login, a
   * pessoa entra pela página "Entrar" com a senha nova. Todos os links pendentes da conta deixam de valer.
   */
  async redefinirSenha(token: string, senha: string): Promise<void> {
    if (token.length !== TAMANHO_TOKEN_ACESSO) {
      throw new AppError(
        'Este link parece estar incompleto: ele foi cortado ao ser copiado. Abra-o direto pelo botão do e-mail ou peça outro em "Esqueci minha senha".',
        400,
        'TOKEN_INCOMPLETO',
      );
    }

    const registro = await this.prisma.tokenAcesso.findUnique({
      where: { tokenHash: crypto.createHash('sha256').update(token).digest('hex') },
      include: { user: true },
    });

    if (registro?.tipo !== TIPO_REDEFINICAO) {
      throw new AppError(
        'Este link não é válido. Peça outro em "Esqueci minha senha".',
        400,
        'TOKEN_INVALIDO',
      );
    }
    if (registro.usadoEm) {
      throw new AppError(
        'Este link já foi usado. Se precisar, peça outro em "Esqueci minha senha".',
        400,
        'TOKEN_USADO',
      );
    }
    if (!registro.expiraEm || registro.expiraEm < new Date()) {
      throw new AppError(
        'Este link expirou. Peça outro em "Esqueci minha senha".',
        400,
        'TOKEN_EXPIRADO',
      );
    }
    if (!registro.user.ativo) {
      throw new UnauthorizedError('Esta conta não está ativa');
    }

    const senhaHash = await bcrypt.hash(senha, BCRYPT_ROUNDS);
    const trocou = await this.prisma.$transaction(async (tx) => {
      // Marca como usado só se ainda não foi (duas abas com o mesmo link: a segunda falha).
      const marcado = await tx.tokenAcesso.updateMany({
        where: { id: registro.id, usadoEm: null },
        data: { usadoEm: new Date() },
      });
      if (marcado.count === 0) return false;

      await tx.tokenAcesso.updateMany({
        where: { userId: registro.userId, usadoEm: null },
        data: { usadoEm: new Date() },
      });
      // Quem perdeu a senha pode ter perdido também o controle de uma sessão aberta: derruba todas.
      await tx.user.update({
        where: { id: registro.userId },
        data: { senhaHash, tokenVersion: { increment: 1 } },
      });
      return true;
    });

    if (!trocou) {
      throw new AppError(
        'Este link já foi usado. Se precisar, peça outro em "Esqueci minha senha".',
        400,
        'TOKEN_USADO',
      );
    }
  }

  /**
   * Moradores de um condomínio com assinatura suspensa não entram até o síndico pagar a
   * mensalidade. O síndico (e o admin) continuam entrando, justamente pra poder pagar.
   */
  private garantirCondominioEmDia(user: {
    papel: AuthenticatedUser['papel'];
    condominio?: { assinatura?: { status: string } | null } | null;
  }): void {
    if (user.papel === 'MORADOR' && user.condominio?.assinatura?.status === 'SUSPENSA') {
      throw new UnauthorizedError(
        'O acesso do condomínio está suspenso por falta de pagamento. Fale com o síndico.',
      );
    }
  }

  /** Renova o access token a partir de um refresh token válido. */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const { refreshSecret } = this.getSecrets();

    let payload: { userId: string; v?: number };
    try {
      payload = jwt.verify(refreshToken, refreshSecret, { algorithms: ['HS256'] }) as {
        userId: string;
        v?: number;
      };
    } catch {
      throw new UnauthorizedError('Refresh token inválido ou expirado');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      include: { condominio: { include: { assinatura: true } } },
    });
    if (!user || !user.ativo) {
      throw new UnauthorizedError('Usuário não encontrado');
    }

    // Token emitido antes de um logout ou de uma troca de senha: não vale mais.
    if ((payload.v ?? 0) !== (user.tokenVersion ?? 0)) {
      throw new UnauthorizedError('Sessão encerrada. Entre novamente.');
    }

    this.garantirCondominioEmDia(user);

    return this.issueTokens(toAuthenticatedUser(user), user.tokenVersion);
  }
}
