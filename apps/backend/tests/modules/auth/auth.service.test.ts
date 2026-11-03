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
  const prisma: any = {
    condominio: { findUnique: jest.fn() },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    tokenAcesso: { findUnique: jest.fn(), updateMany: jest.fn() },
  };
  prisma.$transaction = jest.fn((callback: (tx: unknown) => unknown) => callback(prisma));
  return prisma;
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
      data: { nome: 'Ana Paula Ribeiro', apartamento: '202', cpf: undefined },
    });
    expect(result.nome).toBe('Ana Paula Ribeiro');
    expect(result.apartamento).toBe('202');
  });

  it('normaliza e salva o CPF (aceita com pontuação)', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue({
      id: 'user-1',
      nome: 'Ana Paula',
      email: 'ana@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
      apartamento: '202',
      cpf: '12345678901',
    });

    const service = new AuthService(prisma);
    const result = await service.atualizarPerfil('user-1', {
      nome: 'Ana Paula',
      apartamento: '202',
      cpf: '123.456.789-01',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { nome: 'Ana Paula', apartamento: '202', cpf: '12345678901' },
    });
    expect(result.cpf).toBe('12345678901');
  });

  it('rejeita CPF com menos de 11 dígitos', async () => {
    const prisma = buildPrismaMock();

    const service = new AuthService(prisma);

    await expect(
      service.atualizarPerfil('user-1', { nome: 'Ana Paula', cpf: '123' }),
    ).rejects.toBeInstanceOf(AppError);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejeita CPF já cadastrado por outro usuário', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findFirst.mockResolvedValue({ id: 'outro-user' });

    const service = new AuthService(prisma);

    await expect(
      service.atualizarPerfil('user-1', { nome: 'Ana Paula', cpf: '12345678901' }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.user.update).not.toHaveBeenCalled();
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

describe('AuthService — assinatura do condomínio', () => {
  const senhaHash = bcrypt.hashSync('senha-correta', 10);
  const moradorInput = {
    linkSlug: 'residencial-teste',
    pin: '1234',
    nome: 'Carlos Mendes',
    email: 'carlos@example.com',
    senha: 'senha-forte-123',
  };
  const condominio = {
    id: 'cond-1',
    nome: 'Residencial Teste',
    linkSlug: 'residencial-teste',
    pin: '1234',
    ativo: true,
  };

  it('barra o cadastro de morador quando o condomínio atingiu o limite do plano', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findUnique.mockResolvedValue({
      ...condominio,
      assinatura: { limiteMoradores: 30, status: 'ATIVA' },
    });
    prisma.user.count.mockResolvedValue(30);

    await expect(new AuthService(prisma).cadastrarMorador(moradorInput)).rejects.toMatchObject({
      statusCode: 409,
      code: 'LIMITE_MORADORES',
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { condominioId: 'cond-1', papel: 'MORADOR', ativo: true },
    });
  });

  it('cadastra normalmente enquanto há vaga no plano', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findUnique.mockResolvedValue({
      ...condominio,
      assinatura: { limiteMoradores: 30, status: 'ATIVA' },
    });
    prisma.user.count.mockResolvedValue(29);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'u1', ...data }),
    );

    const result = await new AuthService(prisma).cadastrarMorador(moradorInput);

    expect(result.user.papel).toBe('MORADOR');
  });

  it('não entra morador de condomínio com assinatura suspensa', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'ana@example.com',
      senhaHash,
      papel: 'MORADOR',
      condominioId: 'cond-1',
      ativo: true,
      condominio: { assinatura: { status: 'SUSPENSA' } },
    });

    await expect(
      new AuthService(prisma).login({ email: 'ana@example.com', senha: 'senha-correta' }),
    ).rejects.toThrow(/suspenso/);
  });

  it('o síndico continua entrando com a assinatura suspensa (precisa pagar)', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue({
      id: 's1',
      email: 'sindico@example.com',
      senhaHash,
      papel: 'SINDICO',
      condominioId: 'cond-1',
      ativo: true,
      condominio: { assinatura: { status: 'SUSPENSA' } },
    });

    const result = await new AuthService(prisma).login({
      email: 'sindico@example.com',
      senha: 'senha-correta',
    });

    expect(result.user.papel).toBe('SINDICO');
  });
});

describe('AuthService.definirSenha', () => {
  const tokenValido = (extra: Record<string, unknown> = {}) => ({
    id: 'tok-1',
    userId: 's1',
    usadoEm: null,
    expiraEm: new Date(Date.now() + 60_000),
    user: {
      id: 's1',
      nome: 'Sílvia',
      email: 'silvia@exemplo.com',
      papel: 'SINDICO',
      condominioId: 'cond-1',
      ativo: true,
    },
    ...extra,
  });

  it('define a senha, marca o link como usado e já entra', async () => {
    const prisma = buildPrismaMock();
    prisma.tokenAcesso.findUnique.mockResolvedValue(tokenValido());
    prisma.tokenAcesso.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.update.mockImplementation(({ data }: any) =>
      Promise.resolve({
        id: 's1',
        nome: 'Sílvia',
        email: 'silvia@exemplo.com',
        papel: 'SINDICO',
        condominioId: 'cond-1',
        ...data,
      }),
    );

    const result = await new AuthService(prisma).definirSenha('token-da-url', 'minha-senha-nova');

    // Busca pelo hash, nunca pelo token em si.
    const buscado = prisma.tokenAcesso.findUnique.mock.calls[0][0].where.tokenHash;
    expect(buscado).toMatch(/^[0-9a-f]{64}$/);
    expect(buscado).not.toContain('token-da-url');
    expect(prisma.tokenAcesso.updateMany).toHaveBeenCalledWith({
      where: { id: 'tok-1', usadoEm: null },
      data: { usadoEm: expect.any(Date) },
    });
    const senhaGravada = prisma.user.update.mock.calls[0][0].data.senhaHash;
    expect(bcrypt.compareSync('minha-senha-nova', senhaGravada)).toBe(true);
    expect(result.user.papel).toBe('SINDICO');
    expect(result.accessToken).toEqual(expect.any(String));
  });

  it.each([
    ['inexistente', null],
    ['já usado', tokenValido({ usadoEm: new Date() })],
    ['expirado', tokenValido({ expiraEm: new Date(Date.now() - 1000) })],
  ])('recusa link %s', async (_nome, registro) => {
    const prisma = buildPrismaMock();
    prisma.tokenAcesso.findUnique.mockResolvedValue(registro);

    await expect(
      new AuthService(prisma).definirSenha('x'.repeat(20), 'minha-senha-nova'),
    ).rejects.toMatchObject({
      code: 'TOKEN_INVALIDO',
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('recusa quando o mesmo link é usado em duas abas ao mesmo tempo', async () => {
    const prisma = buildPrismaMock();
    prisma.tokenAcesso.findUnique.mockResolvedValue(tokenValido());
    prisma.tokenAcesso.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      new AuthService(prisma).definirSenha('x'.repeat(20), 'minha-senha-nova'),
    ).rejects.toMatchObject({
      code: 'TOKEN_INVALIDO',
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
