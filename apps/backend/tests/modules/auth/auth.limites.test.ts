import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';

jest.mock('@/common/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn() },
    condominio: { findUnique: jest.fn() },
    tokenAcesso: { findUnique: jest.fn() },
  },
}));

// Dezenas de tentativas com bcrypt por teste: o limite padrão de 5 s não basta quando a suíte roda em paralelo.
jest.setTimeout(60_000);

const ACCESS_SECRET = 'test-access-secret';
const REFRESH_SECRET = 'test-refresh-secret';
const AMBIENTE = { ...process.env };

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
  process.env.JWT_REFRESH_SECRET = REFRESH_SECRET;
});

afterEach(() => {
  process.env = {
    ...AMBIENTE,
    JWT_ACCESS_SECRET: ACCESS_SECRET,
    JWT_REFRESH_SECRET: REFRESH_SECRET,
  };
});

/** Cada teste carrega um app novo: os limitadores guardam as contagens em memória, dentro do módulo. */
function novoApp(confiarNoProxy = false) {
  // Os limitadores ficam desligados quando NODE_ENV é "test"; aqui eles precisam agir de verdade.
  process.env.NODE_ENV = 'development';
  if (confiarNoProxy) process.env.TRUST_PROXY = '1';
  let app: import('express').Express | undefined;
  let prisma: any;
  jest.isolateModules(() => {
    /* eslint-disable @typescript-eslint/no-require-imports -- isolateModules só aceita require síncrono */
    prisma = require('@/common/prisma').prisma;
    app = require('@/app').createApp();
    /* eslint-enable @typescript-eslint/no-require-imports */
  });
  return { app: app!, prisma };
}

const cadastro = (slug: string, pin: string, email = 'novo@example.com') => ({
  linkSlug: slug,
  pin,
  nome: 'Ana Paula',
  email,
  senha: 'cafe-com-pao-42',
  aceiteTermos: true,
});

describe('limites de tentativas (rotas de autenticação)', () => {
  it('login: a 9ª tentativa errada na mesma conta é barrada, e outra conta não é afetada', async () => {
    const { app, prisma } = novoApp();
    prisma.user.findUnique.mockResolvedValue(null);
    const tentar = (email: string) =>
      request(app).post('/api/auth/login').send({ email, senha: 'errada-12345' });

    for (let i = 0; i < 8; i += 1) {
      expect((await tentar('ana@example.com')).status).toBe(401);
    }
    const bloqueada = await tentar('ana@example.com');

    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(bloqueada.body.error.message).toMatch(/Esqueci minha senha/);
    expect((await tentar('bruno@example.com')).status).toBe(401);
  });

  it('login: o mesmo endereço errando em muitas contas também é barrado', async () => {
    const { app, prisma } = novoApp();
    prisma.user.findUnique.mockResolvedValue(null);

    for (let i = 0; i < 40; i += 1) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: `pessoa${i}@example.com`, senha: 'errada-12345' });
    }
    const bloqueada = await request(app)
      .post('/api/auth/login')
      .send({ email: 'outra@example.com', senha: 'errada-12345' });

    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body.error.message).toMatch(/este endereço/);
  });

  it('cadastro: depois de 10 PINs errados do mesmo endereço, barra', async () => {
    const { app, prisma } = novoApp();
    prisma.condominio.findUnique.mockResolvedValue({
      id: 'c1',
      linkSlug: 'residencial-teste',
      pin: '1234',
      ativo: true,
      assinatura: null,
    });
    const tentar = () =>
      request(app).post('/api/auth/cadastro').send(cadastro('residencial-teste', '0000'));

    for (let i = 0; i < 10; i += 1) {
      expect((await tentar()).status).toBe(401);
    }
    const bloqueada = await tentar();

    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body.error.message).toMatch(/cadastro a partir deste endereço/);
  });

  it('cadastro: o PIN de um condomínio também é protegido contra vários endereços', async () => {
    const { app, prisma } = novoApp(true);
    prisma.condominio.findUnique.mockResolvedValue({
      id: 'c1',
      linkSlug: 'residencial-teste',
      pin: '1234',
      ativo: true,
      assinatura: null,
    });
    const tentar = (ip: string) =>
      request(app)
        .post('/api/auth/cadastro')
        .set('X-Forwarded-For', ip)
        .send(cadastro('residencial-teste', '0000'));

    for (let i = 0; i < 20; i += 1) {
      expect((await tentar(`203.0.113.${i + 1}`)).status).toBe(401);
    }
    const bloqueada = await tentar('203.0.113.200');

    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body.error.message).toMatch(/PIN para este condomínio/);
  });

  it('cadastro: quem acerta o PIN zera a contagem do condomínio', async () => {
    const { app, prisma } = novoApp(true);
    prisma.condominio.findUnique.mockResolvedValue({
      id: 'c1',
      linkSlug: 'residencial-teste',
      pin: '1234',
      ativo: true,
      assinatura: null,
    });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create = jest.fn().mockResolvedValue({
      id: 'u1',
      nome: 'Ana Paula',
      email: 'ana@example.com',
      papel: 'MORADOR',
      condominioId: 'c1',
      tokenVersion: 0,
    });
    const tentar = (ip: string, pin: string) =>
      request(app)
        .post('/api/auth/cadastro')
        .set('X-Forwarded-For', ip)
        .send(cadastro('residencial-teste', pin));

    for (let i = 0; i < 19; i += 1) await tentar(`198.51.100.${i + 1}`, '0000');
    expect((await tentar('198.51.100.100', '1234')).status).toBe(201);
    // zerou: mais uma falha ainda passa (sem o acerto, seria a 21ª e viria 429)
    expect((await tentar('198.51.100.101', '0000')).status).toBe(401);
  });

  it('refresh: renovar a sessão em excesso é barrado', async () => {
    const { app } = novoApp();

    for (let i = 0; i < 120; i += 1) {
      await request(app).post('/api/auth/refresh').send({ refreshToken: 'invalido' });
    }
    const bloqueada = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalido' });

    expect(bloqueada.status).toBe(429);
  });

  it('redefinir senha: tentativas em excesso a partir do mesmo endereço são barradas', async () => {
    const { app } = novoApp();

    for (let i = 0; i < 20; i += 1) {
      expect(
        (await request(app).post('/api/auth/redefinir-senha').send({ token: 'x', senha: 'y' }))
          .status,
      ).toBe(400);
    }
    const bloqueada = await request(app)
      .post('/api/auth/redefinir-senha')
      .send({ token: 'x', senha: 'y' });

    expect(bloqueada.status).toBe(429);
  });

  it('cadastros em excesso a partir do mesmo endereço são barrados, mesmo os que dão certo', async () => {
    const { app, prisma } = novoApp();
    prisma.condominio.findUnique.mockResolvedValue(null);

    for (let i = 0; i < 30; i += 1) {
      // 404 (condomínio inexistente) conta no limite geral de cadastros do endereço
      await request(app).post('/api/auth/cadastro').send(cadastro('nao-existe', '1234'));
    }
    const bloqueada = await request(app)
      .post('/api/auth/cadastro')
      .send(cadastro('nao-existe', '1234'));

    expect(bloqueada.status).toBe(429);
  });
});

describe('POST /api/auth/logout', () => {
  it('derruba as sessões da conta e responde 204', async () => {
    const { app, prisma } = novoApp();
    prisma.user.update.mockResolvedValue({ id: 'user-1' });
    const token = jwt.sign(
      { userId: 'user-1', papel: 'MORADOR', condominioId: 'c1' },
      ACCESS_SECRET,
      {
        expiresIn: '1h',
      },
    );

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(204);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { tokenVersion: { increment: 1 } },
    });
  });
});

describe('POST /api/privacidade/excluir-conta: senha errada em excesso', () => {
  it('depois de 5 senhas erradas, barra novas tentativas (um token roubado não adivinha a senha)', async () => {
    const { app, prisma } = novoApp();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      papel: 'MORADOR',
      ativo: true,
      senhaHash: bcrypt.hashSync('senha-certa-123', 4),
    });
    const token = jwt.sign(
      { userId: 'user-1', papel: 'MORADOR', condominioId: 'c1' },
      ACCESS_SECRET,
      {
        expiresIn: '1h',
      },
    );
    const tentar = () =>
      request(app)
        .post('/api/privacidade/excluir-conta')
        .set('Authorization', `Bearer ${token}`)
        .send({ senha: 'senha-errada-123', confirmacao: 'EXCLUIR' });

    for (let i = 0; i < 5; i += 1) {
      expect((await tentar()).status).toBe(401);
    }
    const bloqueada = await tentar();

    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body.error.message).toMatch(/senha errada/);
  });
});
