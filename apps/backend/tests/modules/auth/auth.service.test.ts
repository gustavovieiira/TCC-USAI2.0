import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { AuthService, TAMANHO_TOKEN_ACESSO } from '@/modules/auth/auth.service';
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
    tokenAcesso: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
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

describe('AuthService: assinatura do condomínio', () => {
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
  // Um código de link tem 43 caracteres; com outro tamanho a senha nem chega a ser verificada.
  const TOKEN = 'k'.repeat(43);

  const tokenValido = (extra: Record<string, unknown> = {}) => ({
    id: 'tok-1',
    userId: 's1',
    tipo: 'ACESSO',
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

    const result = await new AuthService(prisma).definirSenha(TOKEN, 'minha-senha-nova');

    // Busca pelo hash, nunca pelo token em si.
    const buscado = prisma.tokenAcesso.findUnique.mock.calls[0][0].where.tokenHash;
    expect(buscado).toMatch(/^[0-9a-f]{64}$/);
    expect(buscado).not.toContain(TOKEN);
    expect(prisma.tokenAcesso.updateMany).toHaveBeenCalledWith({
      where: { id: 'tok-1', usadoEm: null },
      data: { usadoEm: expect.any(Date) },
    });
    const senhaGravada = prisma.user.update.mock.calls[0][0].data.senhaHash;
    expect(bcrypt.compareSync('minha-senha-nova', senhaGravada)).toBe(true);
    expect(result.user.papel).toBe('SINDICO');
    expect(result.accessToken).toEqual(expect.any(String));
  });

  it('o link não tem prazo: sem validade (expiraEm nulo) funciona, mesmo muito depois do envio', async () => {
    const prisma = buildPrismaMock();
    prisma.tokenAcesso.findUnique.mockResolvedValue(
      tokenValido({ expiraEm: null, createdAt: new Date('2026-01-01') }),
    );
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

    const result = await new AuthService(prisma).definirSenha(TOKEN, 'minha-senha-nova');

    expect(result.user.papel).toBe('SINDICO');
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });

  it('ao criar a senha, TODOS os links do síndico deixam de valer (não só o que foi clicado)', async () => {
    const prisma = buildPrismaMock();
    prisma.tokenAcesso.findUnique.mockResolvedValue(tokenValido({ expiraEm: null }));
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

    await new AuthService(prisma).definirSenha(TOKEN, 'minha-senha-nova');

    expect(prisma.tokenAcesso.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'tok-1', usadoEm: null },
      data: { usadoEm: expect.any(Date) },
    });
    // os outros e-mails enviados (reenvios) também são consumidos
    expect(prisma.tokenAcesso.updateMany).toHaveBeenNthCalledWith(2, {
      where: { userId: 's1', usadoEm: null },
      data: { usadoEm: expect.any(Date) },
    });
  });

  it('um link antigo, de antes dos links valerem sem prazo, ainda respeita a validade que tinha', async () => {
    const prisma = buildPrismaMock();
    prisma.tokenAcesso.findUnique.mockResolvedValue(
      tokenValido({ expiraEm: new Date(Date.now() - 1000) }),
    );

    await expect(
      new AuthService(prisma).definirSenha(TOKEN, 'minha-senha-nova'),
    ).rejects.toMatchObject({ code: 'TOKEN_INVALIDO', message: expect.stringMatching(/expirou/) });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('link que não existe: mensagem clara pedindo outro e-mail', async () => {
    const prisma = buildPrismaMock();
    prisma.tokenAcesso.findUnique.mockResolvedValue(null);

    await expect(
      new AuthService(prisma).definirSenha(TOKEN, 'minha-senha-nova'),
    ).rejects.toMatchObject({
      code: 'TOKEN_INVALIDO',
      message: expect.stringMatching(/não é válido.*outro e-mail/),
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it.each([
    ['cortado em 1 caractere', 'k'.repeat(42)],
    ['com caractere a mais', 'k'.repeat(44)],
    ['só o começo', 'k'.repeat(10)],
  ])('link %s: avisa que está incompleto, sem nem consultar o banco', async (_nome, token) => {
    const prisma = buildPrismaMock();

    await expect(
      new AuthService(prisma).definirSenha(token, 'minha-senha-nova'),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'TOKEN_INCOMPLETO',
      message: expect.stringMatching(/incompleto.*cortado ao ser copiado/),
    });
    expect(prisma.tokenAcesso.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('o tamanho esperado é o de 32 bytes em base64url (43 caracteres)', () => {
    expect(TAMANHO_TOKEN_ACESSO).toBe(43);
    expect(crypto.randomBytes(32).toString('base64url')).toHaveLength(TAMANHO_TOKEN_ACESSO);
  });

  it('senha já criada: explica que o acesso agora é pela página Entrar, com e-mail e senha', async () => {
    const prisma = buildPrismaMock();
    prisma.tokenAcesso.findUnique.mockResolvedValue(tokenValido({ usadoEm: new Date() }));

    await expect(
      new AuthService(prisma).definirSenha(TOKEN, 'outra-senha-123'),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'SENHA_JA_CRIADA',
      message: expect.stringMatching(/Entrar.*e-mail e a senha/),
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('recusa quando o mesmo link é usado em duas abas ao mesmo tempo', async () => {
    const prisma = buildPrismaMock();
    prisma.tokenAcesso.findUnique.mockResolvedValue(tokenValido());
    prisma.tokenAcesso.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      new AuthService(prisma).definirSenha(TOKEN, 'minha-senha-nova'),
    ).rejects.toMatchObject({ code: 'SENHA_JA_CRIADA' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('AuthService.definirSenha com link de redefinição', () => {
  it('um link de "esqueci minha senha" não serve para o primeiro acesso', async () => {
    const prisma = buildPrismaMock();
    prisma.tokenAcesso.findUnique.mockResolvedValue({
      id: 'tok-9',
      userId: 's1',
      tipo: 'REDEFINICAO',
      usadoEm: null,
      expiraEm: new Date(Date.now() + 60_000),
      user: { id: 's1', ativo: true },
    });

    await expect(
      new AuthService(prisma).definirSenha('k'.repeat(43), 'minha-senha-nova'),
    ).rejects.toMatchObject({ code: 'TOKEN_INVALIDO' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('AuthService.solicitarRedefinicaoSenha', () => {
  const mailerVazio = () => ({ enviar: jest.fn().mockResolvedValue(undefined) });
  const usuario = { id: 's1', nome: 'Sílvia', email: 'silvia@exemplo.com', ativo: true };

  it('envia o e-mail com um link de 43 caracteres que vale 1 hora, guardando só o hash', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue(usuario);
    prisma.tokenAcesso.findFirst.mockResolvedValue(null);
    const mailer = mailerVazio();

    const antes = Date.now();
    await new AuthService(prisma, mailer).solicitarRedefinicaoSenha('silvia@exemplo.com');

    const { data } = prisma.tokenAcesso.create.mock.calls[0][0];
    expect(data.tipo).toBe('REDEFINICAO');
    expect(data.userId).toBe('s1');
    const prazo = data.expiraEm.getTime() - antes;
    expect(prazo).toBeGreaterThanOrEqual(59 * 60 * 1000);
    expect(prazo).toBeLessThanOrEqual(61 * 60 * 1000);

    const email = mailer.enviar.mock.calls[0][0];
    expect(email.para).toBe('silvia@exemplo.com');
    const [, codigo] = /redefinir-senha\?token=(\S+)/.exec(email.texto) ?? [];
    expect(codigo).toHaveLength(TAMANHO_TOKEN_ACESSO);
    expect(data.tokenHash).toBe(crypto.createHash('sha256').update(codigo).digest('hex'));
    expect(email.texto).toContain('1 hora');
  });

  it('e-mail sem conta: não cria link nem envia nada (e não avisa quem pediu)', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue(null);
    const mailer = mailerVazio();

    await expect(
      new AuthService(prisma, mailer).solicitarRedefinicaoSenha('ninguem@exemplo.com'),
    ).resolves.toBeUndefined();

    expect(prisma.tokenAcesso.create).not.toHaveBeenCalled();
    expect(mailer.enviar).not.toHaveBeenCalled();
  });

  it('conta desativada: não envia', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ ...usuario, ativo: false });
    const mailer = mailerVazio();

    await new AuthService(prisma, mailer).solicitarRedefinicaoSenha('silvia@exemplo.com');

    expect(mailer.enviar).not.toHaveBeenCalled();
  });

  it('pedido repetido em menos de 1 minuto: não manda outro e-mail', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue(usuario);
    prisma.tokenAcesso.findFirst.mockResolvedValue({ id: 'recente' });
    const mailer = mailerVazio();

    await new AuthService(prisma, mailer).solicitarRedefinicaoSenha('silvia@exemplo.com');

    expect(prisma.tokenAcesso.create).not.toHaveBeenCalled();
    expect(mailer.enviar).not.toHaveBeenCalled();
  });
});

describe('AuthService.redefinirSenha', () => {
  const TOKEN = 'r'.repeat(43);

  const registro = (extra: Record<string, unknown> = {}) => ({
    id: 'tok-1',
    userId: 's1',
    tipo: 'REDEFINICAO',
    usadoEm: null,
    expiraEm: new Date(Date.now() + 60_000),
    user: { id: 's1', ativo: true },
    ...extra,
  });

  it('troca a senha, invalida os links pendentes da conta e não faz login', async () => {
    const prisma = buildPrismaMock();
    prisma.tokenAcesso.findUnique.mockResolvedValue(registro());
    prisma.tokenAcesso.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.update.mockResolvedValue({ id: 's1' });

    const resultado = await new AuthService(prisma).redefinirSenha(TOKEN, 'senha-nova-123');

    expect(resultado).toBeUndefined();
    expect(prisma.tokenAcesso.findUnique.mock.calls[0][0].where.tokenHash).toBe(
      crypto.createHash('sha256').update(TOKEN).digest('hex'),
    );
    // 1ª chamada marca este link; 2ª, todos os outros pendentes da mesma conta.
    expect(prisma.tokenAcesso.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.tokenAcesso.updateMany.mock.calls[1][0].where).toEqual({
      userId: 's1',
      usadoEm: null,
    });
    const { data } = prisma.user.update.mock.calls[0][0];
    expect(await bcrypt.compare('senha-nova-123', data.senhaHash)).toBe(true);
  });

  it.each([
    ['cortado', 'r'.repeat(42), 'TOKEN_INCOMPLETO', {}],
    ['de outro tipo (primeiro acesso)', TOKEN, 'TOKEN_INVALIDO', { tipo: 'ACESSO' }],
    ['já usado', TOKEN, 'TOKEN_USADO', { usadoEm: new Date() }],
    ['vencido', TOKEN, 'TOKEN_EXPIRADO', { expiraEm: new Date(Date.now() - 1000) }],
    ['sem validade gravada', TOKEN, 'TOKEN_EXPIRADO', { expiraEm: null }],
  ])(
    'link %s: recusa com o código certo e não troca a senha',
    async (_nome, token, code, extra) => {
      const prisma = buildPrismaMock();
      prisma.tokenAcesso.findUnique.mockResolvedValue(registro(extra as Record<string, unknown>));

      await expect(
        new AuthService(prisma).redefinirSenha(token, 'senha-nova-123'),
      ).rejects.toMatchObject({
        statusCode: 400,
        code,
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
    },
  );

  it('link que não existe: TOKEN_INVALIDO', async () => {
    const prisma = buildPrismaMock();
    prisma.tokenAcesso.findUnique.mockResolvedValue(null);

    await expect(
      new AuthService(prisma).redefinirSenha(TOKEN, 'senha-nova-123'),
    ).rejects.toMatchObject({ code: 'TOKEN_INVALIDO' });
  });

  it('conta desativada: não troca a senha', async () => {
    const prisma = buildPrismaMock();
    prisma.tokenAcesso.findUnique.mockResolvedValue(registro({ user: { id: 's1', ativo: false } }));

    await expect(
      new AuthService(prisma).redefinirSenha(TOKEN, 'senha-nova-123'),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('duas abas com o mesmo link ao mesmo tempo: a segunda recebe TOKEN_USADO', async () => {
    const prisma = buildPrismaMock();
    prisma.tokenAcesso.findUnique.mockResolvedValue(registro());
    prisma.tokenAcesso.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      new AuthService(prisma).redefinirSenha(TOKEN, 'senha-nova-123'),
    ).rejects.toMatchObject({ code: 'TOKEN_USADO' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
