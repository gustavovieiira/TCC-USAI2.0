import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('@/common/prisma', () => {
  const mockPrisma = {
    solicitacaoSaque: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _sum: { valor: null } }),
    },
    locacao: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { valorTotal: null } }),
    },
    logAuditoria: { create: jest.fn() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  mockPrisma.$transaction = jest.fn((callback: (tx: unknown) => unknown) => callback(mockPrisma));

  return { prisma: mockPrisma };
});

import { createApp } from '@/app';
import { prisma } from '@/common/prisma';

const ACCESS_SECRET = 'test-access-secret';
const USER_ID = 'user-1';
const ADMIN_ID = 'admin-1';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
});

beforeEach(() => {
  jest.clearAllMocks();
});

function token(userId: string, papel: 'MORADOR' | 'ADMIN' = 'MORADOR'): string {
  return jwt.sign(
    { userId, papel, condominioId: papel === 'MORADOR' ? 'cond-1' : null },
    ACCESS_SECRET,
    { expiresIn: '1h' },
  );
}

const saqueBase = {
  id: 'saque-1',
  userId: USER_ID,
  valor: 100,
  chavePixUsada: 'user@pix.com',
  status: 'PENDENTE',
  motivoRejeicao: null,
  createdAt: new Date('2026-09-16'),
  processadoEm: null,
  user: { nome: 'Ana Proprietaria' },
};

describe('POST /api/saques', () => {
  it('solicita o saque e retorna 201 quando cabe no saldo disponível', async () => {
    (prisma.locacao.aggregate as jest.Mock).mockResolvedValue({ _sum: { valorTotal: 100 } });
    (prisma.solicitacaoSaque.create as jest.Mock).mockResolvedValue(saqueBase);
    const app = createApp();

    const response = await request(app)
      .post('/api/saques')
      .set('Authorization', `Bearer ${token(USER_ID)}`)
      .send({ valor: 100, chavePixUsada: 'user@pix.com' });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('PENDENTE');
  });

  it('rejeita valor negativo com 400', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/saques')
      .set('Authorization', `Bearer ${token(USER_ID)}`)
      .send({ valor: -10, chavePixUsada: 'user@pix.com' });

    expect(response.status).toBe(400);
  });

  it('rejeita com 400 quando o valor pedido é maior que o saldo disponível', async () => {
    (prisma.locacao.aggregate as jest.Mock).mockResolvedValue({ _sum: { valorTotal: 50 } });
    const app = createApp();

    const response = await request(app)
      .post('/api/saques')
      .set('Authorization', `Bearer ${token(USER_ID)}`)
      .send({ valor: 100, chavePixUsada: 'user@pix.com' });

    expect(response.status).toBe(400);
    expect(prisma.solicitacaoSaque.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/saques/saldo', () => {
  it('retorna o saldo líquido disponível pro usuário autenticado', async () => {
    (prisma.locacao.aggregate as jest.Mock).mockResolvedValue({ _sum: { valorTotal: 300 } });
    (prisma.solicitacaoSaque.aggregate as jest.Mock)
      .mockResolvedValueOnce({ _sum: { valor: 100 } })
      .mockResolvedValueOnce({ _sum: { valor: 0 } });
    const app = createApp();

    const response = await request(app)
      .get('/api/saques/saldo')
      .set('Authorization', `Bearer ${token(USER_ID)}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ saldo: 200 });
  });
});

describe('GET /api/saques/minhas', () => {
  it('lista as solicitações do próprio usuário', async () => {
    (prisma.solicitacaoSaque.findMany as jest.Mock).mockResolvedValue([saqueBase]);
    const app = createApp();

    const response = await request(app)
      .get('/api/saques/minhas')
      .set('Authorization', `Bearer ${token(USER_ID)}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });
});

describe('GET /api/saques (Admin)', () => {
  it('lista todas as solicitações, filtrando por status', async () => {
    (prisma.solicitacaoSaque.findMany as jest.Mock).mockResolvedValue([saqueBase]);
    const app = createApp();

    const response = await request(app)
      .get('/api/saques?status=PENDENTE')
      .set('Authorization', `Bearer ${token(ADMIN_ID, 'ADMIN')}`);

    expect(response.status).toBe(200);
    expect(prisma.solicitacaoSaque.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PENDENTE' }, include: { user: true } }),
    );
    expect(response.body[0].solicitanteNome).toBe('Ana Proprietaria');
  });
});

describe('POST /api/saques/:id/aprovar e /rejeitar (Admin)', () => {
  it('aprova uma solicitação pendente e registra auditoria', async () => {
    (prisma.solicitacaoSaque.findUnique as jest.Mock).mockResolvedValue(saqueBase);
    (prisma.solicitacaoSaque.update as jest.Mock).mockResolvedValue({
      ...saqueBase,
      status: 'APROVADO',
    });
    const app = createApp();

    const response = await request(app)
      .post('/api/saques/saque-1/aprovar')
      .set('Authorization', `Bearer ${token(ADMIN_ID, 'ADMIN')}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('APROVADO');
    expect(prisma.logAuditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ adminId: ADMIN_ID, acao: 'APROVAR_SAQUE' }),
      }),
    );
  });

  it('rejeita uma solicitação informando o motivo', async () => {
    (prisma.solicitacaoSaque.findUnique as jest.Mock).mockResolvedValue(saqueBase);
    (prisma.solicitacaoSaque.update as jest.Mock).mockResolvedValue({
      ...saqueBase,
      status: 'REJEITADO',
      motivoRejeicao: 'Chave PIX divergente',
    });
    const app = createApp();

    const response = await request(app)
      .post('/api/saques/saque-1/rejeitar')
      .set('Authorization', `Bearer ${token(ADMIN_ID, 'ADMIN')}`)
      .send({ motivoRejeicao: 'Chave PIX divergente' });

    expect(response.status).toBe(200);
    expect(response.body.motivoRejeicao).toBe('Chave PIX divergente');
  });

  it('retorna 404 quando a solicitação não existe', async () => {
    (prisma.solicitacaoSaque.findUnique as jest.Mock).mockResolvedValue(null);
    const app = createApp();

    const response = await request(app)
      .post('/api/saques/inexistente/aprovar')
      .set('Authorization', `Bearer ${token(ADMIN_ID, 'ADMIN')}`);

    expect(response.status).toBe(404);
  });
});
