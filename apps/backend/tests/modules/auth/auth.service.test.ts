import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '@/modules/auth/auth.service';
import { AppError, ConflictError, NotFoundError, UnauthorizedError } from '@/common/errors';

// Fixa os segredos independentemente do ambiente (local ou CI podem ter valores diferentes
// para JWT_ACCESS_SECRET/JWT_REFRESH_SECRET), para o teste não depender do fallback interno do serviço.
const TEST_REFRESH_SECRET = 'test-refresh-secret';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = TEST_REFRESH_SECRET;
});

function buildPrismaMock() {
  return {
    condominio: { findUnique: jest.fn() },
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  } as any;
}

const condominioAtivo = {
  id: 'cond-1',
  nome: 'Residencial Teste',
  linkSlug: 'residencial-teste',
  pin: '1234',
  ativo: true,
};

const moradorInput = {
  linkSlug: 'residencial-teste',
  pin: '1234',
  nome: 'Carlos Mendes',
  email: 'carlos@example.com',
  senha: 'senha-forte-123',
  apartamento: '101',
};

describe('AuthService.cadastrarMorador', () => {
  it('cadastra o morador quando link e PIN do condomínio são válidos (RF01/RF02)', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findUnique.mockResolvedValue(condominioAtivo);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'user-1', ...data }),
    );

    const service = new AuthService(prisma);
    const result = await service.cadastrarMorador(moradorInput);

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ condominioId: 'cond-1', papel: 'MORADOR' }),
      }),
    );
    expect(result.user.email).toBe(moradorInput.email);
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
  });

  it('rejeita cadastro quando o condomínio não existe (RN03)', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findUnique.mockResolvedValue(null);

    const service = new AuthService(prisma);

    await expect(service.cadastrarMorador(moradorInput)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejeita cadastro quando o condomínio está inativo', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findUnique.mockResolvedValue({ ...condominioAtivo, ativo: false });

    const service = new AuthService(prisma);

    await expect(service.cadastrarMorador(moradorInput)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejeita cadastro quando o PIN informado está incorreto (RN03)', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findUnique.mockResolvedValue(condominioAtivo);

    const service = new AuthService(prisma);

    await expect(service.cadastrarMorador({ ...moradorInput, pin: '9999' })).rejects.toBeInstanceOf(
      AppError,
    );
  });

  it('rejeita cadastro quando já existe conta com o mesmo e-mail', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findUnique.mockResolvedValue(condominioAtivo);
    prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

    const service = new AuthService(prisma);

    await expect(service.cadastrarMorador(moradorInput)).rejects.toBeInstanceOf(ConflictError);
  });

  it('armazena a senha como hash, nunca em texto puro', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findUnique.mockResolvedValue(condominioAtivo);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'user-1', ...data }),
    );

    const service = new AuthService(prisma);
    await service.cadastrarMorador(moradorInput);

    const [[createArgs]] = prisma.user.create.mock.calls;
    expect(createArgs.data.senhaHash).not.toBe(moradorInput.senha);
    expect(await bcrypt.compare(moradorInput.senha, createArgs.data.senhaHash)).toBe(true);
  });
});

describe('AuthService.login', () => {
  const senhaHash = bcrypt.hashSync('senha-correta', 10);
  const usuario = {
    id: 'user-1',
    nome: 'Ana Paula',
    email: 'ana@example.com',
    senhaHash,
    papel: 'MORADOR' as const,
    condominioId: 'cond-1',
    ativo: true,
  };

  it('autentica com credenciais válidas (RF03)', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue(usuario);

    const service = new AuthService(prisma);
    const result = await service.login({ email: usuario.email, senha: 'senha-correta' });

    expect(result.user.id).toBe(usuario.id);
    expect(result.accessToken).toEqual(expect.any(String));
  });

  it('rejeita login com e-mail inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue(null);

    const service = new AuthService(prisma);

    await expect(
      service.login({ email: 'ninguem@example.com', senha: 'qualquer' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejeita login com senha incorreta', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue(usuario);

    const service = new AuthService(prisma);

    await expect(
      service.login({ email: usuario.email, senha: 'senha-errada' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejeita login de conta desativada pelo síndico, mesmo com senha correta', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ ...usuario, ativo: false });

    const service = new AuthService(prisma);

    await expect(
      service.login({ email: usuario.email, senha: 'senha-correta' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe('AuthService.atualizarPerfil', () => {
  it('atualiza nome e apartamento do próprio usuário', async () => {
    const prisma = buildPrismaMock();
    prisma.user.update.mockResolvedValue({
      id: 'user-1',
      nome: 'Ana Paula Ribeiro',
      email: 'ana@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
      apartamento: '202',
    });

    const service = new AuthService(prisma);
    const result = await service.atualizarPerfil('user-1', {
      nome: 'Ana Paula Ribeiro',
      apartamento: '202',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { nome: 'Ana Paula Ribeiro', apartamento: '202' },
    });
    expect(result.nome).toBe('Ana Paula Ribeiro');
    expect(result.apartamento).toBe('202');
  });
});

describe('AuthService.refresh', () => {
  it('emite um novo access token a partir de um refresh token válido', async () => {
    const prisma = buildPrismaMock();
    const usuario = {
      id: 'user-1',
      nome: 'Ana Paula',
      email: 'ana@example.com',
      papel: 'MORADOR' as const,
      condominioId: 'cond-1',
      ativo: true,
    };
    const refreshToken = jwt.sign({ userId: usuario.id }, TEST_REFRESH_SECRET, {
      expiresIn: '7d',
    });
    prisma.user.findUnique.mockResolvedValue(usuario);

    const service = new AuthService(prisma);
    const tokens = await service.refresh(refreshToken);

    expect(tokens.accessToken).toEqual(expect.any(String));
    expect(tokens.refreshToken).toEqual(expect.any(String));
  });

  it('rejeita refresh token inválido', async () => {
    const prisma = buildPrismaMock();
    const service = new AuthService(prisma);

    await expect(service.refresh('token-invalido')).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
