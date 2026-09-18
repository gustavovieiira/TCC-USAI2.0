import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('@/common/prisma', () => ({
  prisma: {
    condominio: { findUnique: jest.fn() },
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
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
    });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('ana@example.com');
    expect(response.body.accessToken).toEqual(expect.any(String));
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
