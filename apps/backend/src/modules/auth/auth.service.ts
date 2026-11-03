import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AppError, ConflictError, NotFoundError, UnauthorizedError } from '@/common/errors';
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

/** Mantém só os dígitos — aceita o CPF com ou sem pontuação (Asaas exige só números). */
function normalizarCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

export class AuthService {
  constructor(private readonly prisma: PrismaClient) {}

  private getSecrets() {
    return {
      accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-secret',
      refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
    };
  }

  private issueTokens(user: AuthenticatedUser): AuthTokens {
    const { accessSecret, refreshSecret } = this.getSecrets();
    const payload = { userId: user.id, papel: user.papel, condominioId: user.condominioId };

    const accessToken = jwt.sign(payload, accessSecret, { expiresIn: ACCESS_TOKEN_TTL });
    const refreshToken = jwt.sign(payload, refreshSecret, { expiresIn: REFRESH_TOKEN_TTL });

    return { accessToken, refreshToken };
  }

  /**
   * RF01/RF02/RN03 — cadastro do morador via link exclusivo + PIN do condomínio.
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

    if (condominio.pin !== input.pin) {
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
      },
    });

    const authenticatedUser = toAuthenticatedUser(user);
    return { ...this.issueTokens(authenticatedUser), user: authenticatedUser };
  }

  /** RF03 — login com e-mail e senha, válido para todos os perfis. */
  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { condominio: { include: { assinatura: true } } },
    });
    if (!user) {
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
    return { ...this.issueTokens(authenticatedUser), user: authenticatedUser };
  }

  /**
   * Morador/síndico/admin edita os próprios dados: nome, apartamento e CPF (necessário pro
   * locatário pagar uma locação via Asaas — M3). CPF fica de fora do update quando não enviado,
   * pra não apagar um valor já cadastrado.
   */
  async atualizarPerfil(userId: string, input: AtualizarPerfilInput): Promise<AuthenticatedUser> {
    let cpf: string | undefined;

    if (input.cpf !== undefined) {
      cpf = normalizarCpf(input.cpf);

      if (cpf.length !== 11) {
        throw new AppError('CPF inválido — deve ter 11 dígitos', 400, 'CPF_INVALIDO');
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
   * senha e já entra. O token é de uso único e expira; só o hash dele existe no banco.
   */
  async definirSenha(token: string, senha: string): Promise<AuthResult> {
    const registro = await this.prisma.tokenAcesso.findUnique({
      where: { tokenHash: crypto.createHash('sha256').update(token).digest('hex') },
      include: { user: true },
    });

    if (!registro || registro.usadoEm || registro.expiraEm < new Date()) {
      throw new AppError(
        'Este link expirou ou já foi usado. Peça um novo na tela de acompanhamento da contratação.',
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
      return tx.user.update({ where: { id: registro.userId }, data: { senhaHash } });
    });

    if (!user) {
      throw new AppError('Este link já foi usado.', 400, 'TOKEN_INVALIDO');
    }

    const authenticatedUser = toAuthenticatedUser(user);
    return { ...this.issueTokens(authenticatedUser), user: authenticatedUser };
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

    let payload: { userId: string };
    try {
      payload = jwt.verify(refreshToken, refreshSecret) as { userId: string };
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

    this.garantirCondominioEmDia(user);

    return this.issueTokens(toAuthenticatedUser(user));
  }
}
