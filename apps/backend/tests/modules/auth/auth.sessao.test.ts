import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '@/modules/auth/auth.service';
import { UnauthorizedError } from '@/common/errors';

const TEST_REFRESH_SECRET = 'test-refresh-secret';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = TEST_REFRESH_SECRET;
});

function buildPrismaMock() {
  const prisma: any = {
    condominio: { findUnique: jest.fn() },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    tokenAcesso: { findUnique: jest.fn(), updateMany: jest.fn() },
  };
  prisma.$transaction = jest.fn((callback: (tx: unknown) => unknown) => callback(prisma));
  return prisma;
}

const usuario = (extra: Record<string, unknown> = {}) => ({
  id: 'user-1',
  nome: 'Ana Paula',
  email: 'ana@example.com',
  papel: 'MORADOR' as const,
  condominioId: 'cond-1',
  ativo: true,
  tokenVersion: 0,
  ...extra,
});

const refreshComVersao = (v?: number) =>
  jwt.sign(v === undefined ? { userId: 'user-1' } : { userId: 'user-1', v }, TEST_REFRESH_SECRET, {
    expiresIn: '7d',
  });

describe('AuthService: sessões que podem ser derrubadas', () => {
  it('o refresh token novo carrega a versão da conta', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue(usuario({ tokenVersion: 3 }));

    const tokens = await new AuthService(prisma).refresh(refreshComVersao(3));

    expect(jwt.decode(tokens.refreshToken)).toMatchObject({ userId: 'user-1', v: 3 });
  });

  it('recusa o refresh token emitido antes de um logout ou de uma troca de senha', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue(usuario({ tokenVersion: 4 }));

    await expect(new AuthService(prisma).refresh(refreshComVersao(3))).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it('aceita o token antigo, sem versão, enquanto a conta nunca derrubou sessões', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue(usuario({ tokenVersion: 0 }));

    await expect(
      new AuthService(prisma).refresh(refreshComVersao(undefined)),
    ).resolves.toBeDefined();
  });

  it('recusa um refresh token assinado com outro algoritmo', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue(usuario());
    const hs512 = jwt.sign({ userId: 'user-1' }, TEST_REFRESH_SECRET, { algorithm: 'HS512' });

    await expect(new AuthService(prisma).refresh(hs512)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('encerrarSessoes aumenta a versão da conta', async () => {
    const prisma = buildPrismaMock();
    prisma.user.update.mockResolvedValue(usuario());

    await new AuthService(prisma).encerrarSessoes('user-1');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { tokenVersion: { increment: 1 } },
    });
  });

  it('trocar a senha pelo link do e-mail derruba as sessões abertas', async () => {
    const prisma = buildPrismaMock();
    prisma.tokenAcesso.findUnique.mockResolvedValue({
      id: 'tok-1',
      userId: 'user-1',
      tipo: 'REDEFINICAO',
      usadoEm: null,
      expiraEm: new Date(Date.now() + 60_000),
      user: { id: 'user-1', ativo: true },
    });
    prisma.tokenAcesso.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.update.mockResolvedValue({ id: 'user-1' });

    await new AuthService(prisma).redefinirSenha('r'.repeat(43), 'senha-nova-123');

    expect(prisma.user.update.mock.calls[0][0].data.tokenVersion).toEqual({ increment: 1 });
  });
});

describe('AuthService: login e cadastro (segurança e LGPD)', () => {
  it('e-mail que não existe leva o mesmo caminho da senha errada (compara com um hash falso)', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue(null);
    const comparar = jest.spyOn(bcrypt, 'compare');

    await expect(
      new AuthService(prisma).login({ email: 'ninguem@example.com', senha: 'qualquer-senha-1' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(comparar).toHaveBeenCalledTimes(1);
    comparar.mockRestore();
  });

  it('o cadastro grava o aceite dos Termos e a versão aceita', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findUnique.mockResolvedValue({
      id: 'cond-1',
      nome: 'Residencial Teste',
      linkSlug: 'residencial-teste',
      pin: '1234',
      ativo: true,
      assinatura: null,
    });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(usuario({ id: 'user-9', nome: 'Carlos' }));

    await new AuthService(prisma).cadastrarMorador({
      linkSlug: 'residencial-teste',
      pin: '1234',
      nome: 'Carlos',
      email: 'carlos@example.com',
      senha: 'senha-forte-123',
      aceiteTermos: true,
    });

    const { data } = prisma.user.create.mock.calls[0][0];
    expect(data.aceitouTermosEm).toBeInstanceOf(Date);
    expect(data.versaoTermos).toEqual(expect.any(String));
  });
});
