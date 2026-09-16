import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('@/common/prisma', () => ({
  prisma: {
    condominio: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: { findUnique: jest.fn(), create: jest.fn() },
    solicitacaoSaque: { aggregate: jest.fn() },
  },
}));

import { createApp } from '@/app';
import { prisma } from '@/common/prisma';

const ACCESS_SECRET = 'test-access-secret';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
});

beforeEach(() => {
  jest.clearAllMocks();
});

function token(): string {
  return jwt.sign({ userId: 'admin-1', papel: 'ADMIN', condominioId: null }, ACCESS_SECRET, {
    expiresIn: '1h',
  });
}

const condominioBase = {
  id: 'cond-1',
  nome: 'Residencial Jardim Europa',
  linkSlug: 'residencial-jardim-europa',
  pin: '1234',
  ativo: true,
  createdAt: new Date('2026-09-16'),
  updatedAt: new Date('2026-09-16'),
};

describe('POST /api/admin/condominios', () => {
  it('cria um condomínio novo e retorna 201', async () => {
    (prisma.condominio.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.condominio.create as jest.Mock).mockResolvedValue(condominioBase);
    const app = createApp();

    const response = await request(app)
      .post('/api/admin/condominios')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        nome: 'Residencial Jardim Europa',
        linkSlug: 'residencial-jardim-europa',
        pin: '1234',
      });

    expect(response.status).toBe(201);
    expect(response.body.linkSlug).toBe('residencial-jardim-europa');
  });

  it('rejeita link de acesso duplicado com 409', async () => {
    (prisma.condominio.findUnique as jest.Mock).mockResolvedValue(condominioBase);
    const app = createApp();

    const response = await request(app)
      .post('/api/admin/condominios')
      .set('Authorization', `Bearer ${token()}`)
      .send({ nome: 'Outro', linkSlug: 'residencial-jardim-europa', pin: '1234' });

    expect(response.status).toBe(409);
    expect(prisma.condominio.create).not.toHaveBeenCalled();
  });

  it('rejeita corpo inválido (PIN com letras) com 400', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/admin/condominios')
      .set('Authorization', `Bearer ${token()}`)
      .send({ nome: 'X', linkSlug: 'x', pin: 'abcd' });

    expect(response.status).toBe(400);
  });
});

describe('GET /api/admin/condominios', () => {
  it('lista os condomínios cadastrados', async () => {
    (prisma.condominio.findMany as jest.Mock).mockResolvedValue([condominioBase]);
    const app = createApp();

    const response = await request(app)
      .get('/api/admin/condominios?ativo=true')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(prisma.condominio.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ativo: true } }),
    );
  });
});

describe('PATCH /api/admin/condominios/:id', () => {
  it('atualiza um condomínio existente', async () => {
    (prisma.condominio.findUnique as jest.Mock).mockResolvedValue(condominioBase);
    (prisma.condominio.update as jest.Mock).mockResolvedValue({ ...condominioBase, ativo: false });
    const app = createApp();

    const response = await request(app)
      .patch('/api/admin/condominios/cond-1')
      .set('Authorization', `Bearer ${token()}`)
      .send({ ativo: false });

    expect(response.status).toBe(200);
    expect(response.body.ativo).toBe(false);
  });

  it('retorna 404 quando o condomínio não existe', async () => {
    (prisma.condominio.findUnique as jest.Mock).mockResolvedValue(null);
    const app = createApp();

    const response = await request(app)
      .patch('/api/admin/condominios/inexistente')
      .set('Authorization', `Bearer ${token()}`)
      .send({ ativo: false });

    expect(response.status).toBe(404);
  });
});

describe('POST /api/admin/sindicos', () => {
  it('cria a conta de síndico e retorna 201', async () => {
    (prisma.condominio.findUnique as jest.Mock).mockResolvedValue(condominioBase);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'user-sindico',
      nome: 'Carla Síndica',
      email: 'carla@example.com',
      condominioId: 'cond-1',
    });
    const app = createApp();

    const response = await request(app)
      .post('/api/admin/sindicos')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        nome: 'Carla Síndica',
        email: 'carla@example.com',
        senha: 'senha-forte-123',
        condominioId: 'cond-1',
      });

    expect(response.status).toBe(201);
    expect(response.body.email).toBe('carla@example.com');
  });

  it('rejeita e-mail já cadastrado com 409', async () => {
    (prisma.condominio.findUnique as jest.Mock).mockResolvedValue(condominioBase);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-existente' });
    const app = createApp();

    const response = await request(app)
      .post('/api/admin/sindicos')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        nome: 'Carla Síndica',
        email: 'carla@example.com',
        senha: 'senha-forte-123',
        condominioId: 'cond-1',
      });

    expect(response.status).toBe(409);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/admin/financeiro/resumo', () => {
  it('retorna o resumo financeiro global', async () => {
    (prisma.solicitacaoSaque.aggregate as jest.Mock)
      .mockResolvedValueOnce({ _count: 2, _sum: { valor: 200 } })
      .mockResolvedValueOnce({ _count: 1, _sum: { valor: 100 } })
      .mockResolvedValueOnce({ _count: 0, _sum: { valor: null } });
    (prisma.condominio.count as jest.Mock).mockResolvedValue(3);
    const app = createApp();

    const response = await request(app)
      .get('/api/admin/financeiro/resumo')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      saques: {
        pendente: { quantidade: 2, valorTotal: 200 },
        aprovado: { quantidade: 1, valorTotal: 100 },
        rejeitado: { quantidade: 0, valorTotal: 0 },
      },
      condominiosAtivos: 3,
    });
  });
});
