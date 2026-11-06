import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('@/common/prisma', () => ({
  prisma: {
    condominio: { findUnique: jest.fn() },
    user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    tokenAcesso: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { createApp } from '@/app';
import { prisma } from '@/common/prisma';

const ACCESS_SECRET = 'test-access-secret';
const REFRESH_SECRET = 'test-refresh-secret';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
  process.env.JWT_REFRESH_SECRET = REFRESH_SECRET;
});

beforeEach(() => {
  jest.clearAllMocks();
});

const condominioBase = {
  id: 'cond-1',
  nome: 'Residencial Jardim Europa',
  linkSlug: 'residencial-jardim-europa',
  pin: '1234',
  ativo: true,
};

describe('POST /api/auth/cadastro', () => {
  it('cadastra o morador e retorna 201 com tokens', async () => {
    (prisma.condominio.findUnique as jest.Mock).mockResolvedValue(condominioBase);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'user-1',
      nome: 'Ana Proprietaria',
      email: 'ana@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
    });
    const app = createApp();

    const response = await request(app).post('/api/auth/cadastro').send({
      nome: 'Ana Proprietaria',
      email: 'ana@example.com',
      senha: 'senha-forte-123',
      linkSlug: 'residencial-jardim-europa',
      pin: '1234',
      aceiteTermos: true,
    });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('ana@example.com');
    expect(response.body.accessToken).toEqual(expect.any(String));
  });

  it('rejeita o cadastro sem o aceite dos Termos e da Política de Privacidade (LGPD)', async () => {
    const app = createApp();

    const response = await request(app).post('/api/auth/cadastro').send({
      nome: 'Ana Proprietaria',
      email: 'ana@example.com',
      senha: 'senha-forte-123',
      linkSlug: 'residencial-jardim-europa',
      pin: '1234',
    });

    expect(response.status).toBe(400);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejeita senha fácil de adivinhar e senha longa demais para o bcrypt', async () => {
    const app = createApp();
    const base = {
      nome: 'Ana Proprietaria',
      email: 'ana@example.com',
      linkSlug: 'residencial-jardim-europa',
      pin: '1234',
      aceiteTermos: true,
    };

    const fraca = await request(app)
      .post('/api/auth/cadastro')
      .send({ ...base, senha: 'password' });
    const longa = await request(app)
      .post('/api/auth/cadastro')
      .send({ ...base, senha: 'a1'.repeat(40) });

    expect(fraca.status).toBe(400);
    expect(longa.status).toBe(400);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejeita PIN incorreto com 401', async () => {
    (prisma.condominio.findUnique as jest.Mock).mockResolvedValue(condominioBase);
    const app = createApp();

    const response = await request(app).post('/api/auth/cadastro').send({
      nome: 'Ana Proprietaria',
      email: 'ana@example.com',
      senha: 'senha-forte-123',
      linkSlug: 'residencial-jardim-europa',
      pin: '0000',
      aceiteTermos: true,
    });

    expect(response.status).toBe(401);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejeita corpo inválido (e-mail malformado) com 400', async () => {
    const app = createApp();

    const response = await request(app).post('/api/auth/cadastro').send({
      nome: 'Ana Proprietaria',
      email: 'não-é-email',
      senha: 'senha-forte-123',
      linkSlug: 'residencial-jardim-europa',
      pin: '1234',
    });

    expect(response.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('autentica com credenciais corretas e retorna 200 com tokens', async () => {
    const senhaHash = await bcrypt.hash('senha-forte-123', 4);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      nome: 'Ana Proprietaria',
      email: 'ana@example.com',
      senhaHash,
      papel: 'MORADOR',
      condominioId: 'cond-1',
      ativo: true,
    });
    const app = createApp();

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@example.com', senha: 'senha-forte-123' });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('ana@example.com');
  });

  it('rejeita senha incorreta com 401', async () => {
    const senhaHash = await bcrypt.hash('senha-forte-123', 4);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      nome: 'Ana Proprietaria',
      email: 'ana@example.com',
      senhaHash,
      papel: 'MORADOR',
      condominioId: 'cond-1',
      ativo: true,
    });
    const app = createApp();

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@example.com', senha: 'senha-errada' });

    expect(response.status).toBe(401);
  });

  it('rejeita conta desativada pelo síndico com 401, mesmo com senha correta', async () => {
    const senhaHash = await bcrypt.hash('senha-forte-123', 4);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      nome: 'Ana Proprietaria',
      email: 'ana@example.com',
      senhaHash,
      papel: 'MORADOR',
      condominioId: 'cond-1',
      ativo: false,
    });
    const app = createApp();

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@example.com', senha: 'senha-forte-123' });

    expect(response.status).toBe(401);
  });
});

describe('PATCH /api/auth/perfil', () => {
  it('atualiza nome e apartamento do usuário autenticado', async () => {
    (prisma.user.update as jest.Mock).mockResolvedValue({
      id: 'user-1',
      nome: 'Ana Paula Ribeiro',
      email: 'ana@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
      apartamento: '303',
    });
    const app = createApp();
    const token = jwt.sign(
      { userId: 'user-1', papel: 'MORADOR', condominioId: 'cond-1' },
      ACCESS_SECRET,
      { expiresIn: '1h' },
    );

    const response = await request(app)
      .patch('/api/auth/perfil')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Ana Paula Ribeiro', apartamento: '303' });

    expect(response.status).toBe(200);
    expect(response.body.nome).toBe('Ana Paula Ribeiro');
    expect(response.body.apartamento).toBe('303');
  });

  it('rejeita sem autenticação com 401', async () => {
    const app = createApp();

    const response = await request(app).patch('/api/auth/perfil').send({ nome: 'Qualquer Nome' });

    expect(response.status).toBe(401);
  });

  it('salva o CPF normalizado quando enviado', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.update as jest.Mock).mockResolvedValue({
      id: 'user-1',
      nome: 'Ana Paula Ribeiro',
      email: 'ana@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
      apartamento: '303',
      cpf: '12345678901',
    });
    const app = createApp();
    const token = jwt.sign(
      { userId: 'user-1', papel: 'MORADOR', condominioId: 'cond-1' },
      ACCESS_SECRET,
      { expiresIn: '1h' },
    );

    const response = await request(app)
      .patch('/api/auth/perfil')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Ana Paula Ribeiro', apartamento: '303', cpf: '123.456.789-01' });

    expect(response.status).toBe(200);
    expect(response.body.cpf).toBe('12345678901');
  });

  it('rejeita CPF já cadastrado por outro usuário com 409', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'outro-user' });
    const app = createApp();
    const token = jwt.sign(
      { userId: 'user-1', papel: 'MORADOR', condominioId: 'cond-1' },
      ACCESS_SECRET,
      { expiresIn: '1h' },
    );

    const response = await request(app)
      .patch('/api/auth/perfil')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Ana Paula Ribeiro', cpf: '12345678901' });

    expect(response.status).toBe(409);
  });
});

describe('POST /api/auth/refresh', () => {
  it('emite novos tokens a partir de um refresh token válido', async () => {
    const refreshToken = jwt.sign(
      { userId: 'user-1', papel: 'MORADOR', condominioId: 'cond-1' },
      REFRESH_SECRET,
      { expiresIn: '7d' },
    );
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      nome: 'Ana Proprietaria',
      email: 'ana@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
      ativo: true,
    });
    const app = createApp();

    const response = await request(app).post('/api/auth/refresh').send({ refreshToken });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
  });

  it('rejeita refresh token inválido com 401', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'token-invalido' });

    expect(response.status).toBe(401);
  });
});

describe('POST /api/auth/esqueci-senha', () => {
  const aguardarSegundoPlano = () => new Promise((resolver) => setImmediate(resolver));

  it('conta existente: responde 202 e cria o link em segundo plano', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u1',
      nome: 'Ana',
      email: 'ana@example.com',
      ativo: true,
    });
    (prisma.tokenAcesso.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.tokenAcesso.create as jest.Mock).mockResolvedValue({});
    const app = createApp();

    const response = await request(app)
      .post('/api/auth/esqueci-senha')
      .send({ email: 'ana@example.com' });
    await aguardarSegundoPlano();

    expect(response.status).toBe(202);
    expect(prisma.tokenAcesso.create).toHaveBeenCalledTimes(1);
  });

  it('conta inexistente: a resposta é idêntica e nada é criado', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const app = createApp();

    const existente = await request(app)
      .post('/api/auth/esqueci-senha')
      .send({ email: 'ninguem@example.com' });
    await aguardarSegundoPlano();

    expect(existente.status).toBe(202);
    expect(existente.body.message).toMatch(/Se este e-mail tiver uma conta/);
    expect(prisma.tokenAcesso.create).not.toHaveBeenCalled();
  });

  it('e-mail inválido: 400', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/auth/esqueci-senha')
      .send({ email: 'nao-e-email' });

    expect(response.status).toBe(400);
  });
});

describe('POST /api/auth/redefinir-senha', () => {
  it('troca a senha com um link válido e responde 200', async () => {
    (prisma.tokenAcesso.findUnique as jest.Mock).mockResolvedValue({
      id: 'tok-1',
      userId: 'u1',
      tipo: 'REDEFINICAO',
      usadoEm: null,
      expiraEm: new Date(Date.now() + 60_000),
      user: { id: 'u1', ativo: true },
    });
    (prisma.tokenAcesso.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.user.update as jest.Mock).mockResolvedValue({ id: 'u1' });
    ((prisma as any).$transaction as jest.Mock).mockImplementation((cb: (tx: unknown) => unknown) =>
      cb(prisma),
    );
    const app = createApp();

    const response = await request(app)
      .post('/api/auth/redefinir-senha')
      .send({ token: 'r'.repeat(43), senha: 'senha-nova-123' });

    expect(response.status).toBe(200);
    expect(response.body.message).toMatch(/Senha alterada/);
  });

  it('senha curta: 400 antes de olhar o link', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/auth/redefinir-senha')
      .send({ token: 'r'.repeat(43), senha: 'curta' });

    expect(response.status).toBe(400);
    expect(prisma.tokenAcesso.findUnique).not.toHaveBeenCalled();
  });

  it('link vencido: 400 com o código TOKEN_EXPIRADO', async () => {
    (prisma.tokenAcesso.findUnique as jest.Mock).mockResolvedValue({
      id: 'tok-1',
      userId: 'u1',
      tipo: 'REDEFINICAO',
      usadoEm: null,
      expiraEm: new Date(Date.now() - 1000),
      user: { id: 'u1', ativo: true },
    });
    const app = createApp();

    const response = await request(app)
      .post('/api/auth/redefinir-senha')
      .send({ token: 'r'.repeat(43), senha: 'senha-nova-123' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('TOKEN_EXPIRADO');
  });
});
