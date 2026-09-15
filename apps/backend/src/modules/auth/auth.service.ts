import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AppError, ConflictError, NotFoundError, UnauthorizedError } from '@/common/errors';
import {
  AuthResult,
  AuthTokens,
  AuthenticatedUser,
  CadastroMoradorInput,
  LoginInput,
} from './auth.types';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const BCRYPT_ROUNDS = 10;

function toAuthenticatedUser(user: {
  id: string;
  nome: string;
  email: string;
  papel: AuthenticatedUser['papel'];
  condominioId: string | null;
}): AuthenticatedUser {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    papel: user.papel,
    condominioId: user.condominioId,
  };
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
    });

    if (!condominio || !condominio.ativo) {
      throw new NotFoundError('Condomínio não encontrado ou inativo');
    }

    if (condominio.pin !== input.pin) {
      throw new AppError('PIN inválido para este condomínio', 401, 'INVALID_PIN');
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
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      throw new UnauthorizedError('Credenciais inválidas');
    }

    const senhaValida = await bcrypt.compare(input.senha, user.senhaHash);
    if (!senhaValida) {
      throw new UnauthorizedError('Credenciais inválidas');
    }

    const authenticatedUser = toAuthenticatedUser(user);
    return { ...this.issueTokens(authenticatedUser), user: authenticatedUser };
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

    const user = await this.prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new UnauthorizedError('Usuário não encontrado');
    }

    return this.issueTokens(toAuthenticatedUser(user));
  }
}
