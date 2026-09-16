import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('@/common/prisma', () => ({
  prisma: {
    item: { findFirst: jest.fn() },
    locacao: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { createApp } from '@/app';
import { prisma } from '@/common/prisma';

const ACCESS_SECRET = 'test-access-secret';
const CONDOMINIO_ID = 'cond-1';
const LOCATARIO_ID = 'user-locatario';
const OWNER_ID = 'user-dono';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
});

beforeEach(() => {
  jest.clearAllMocks();
});

function token(userId: string): string {
  return jwt.sign({ userId, papel: 'MORADOR', condominioId: CONDOMINIO_ID }, ACCESS_SECRET, {
    expiresIn: '1h',
  });
}

const itemBase = {
  id: 'item-1',
  titulo: 'Furadeira',
  valorDiaria: 20,
  ownerId: OWNER_ID,
  condominioId: CONDOMINIO_ID,
  ativo: true,
};

const locacaoBase = {
  id: 'locacao-1',
  itemId: 'item-1',
  locatarioId: LOCATARIO_ID,
  dataInicio: new Date('2026-10-01'),
  dataFim: new Date('2026-10-03'),
  valorTotal: 40,
  status: 'PENDENTE',
  createdAt: new Date('2026-09-16'),
  updatedAt: new Date('2026-09-16'),
  item: itemBase,
};

describe('POST /api/locacoes', () => {
  it('solicita a locação e retorna 201', async () => {
    (prisma.item.findFirst as jest.Mock).mockResolvedValue(itemBase);
    (prisma.locacao.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.locacao.create as jest.Mock).mockResolvedValue(locacaoBase);
    const app = createApp();

    const response = await request(app)
      .post('/api/locacoes')
      .set('Authorization', `Bearer ${token(LOCATARIO_ID)}`)
      .send({ itemId: 'item-1', dataInicio: '2026-10-01', dataFim: '2026-10-03' });

    expect(response.status).toBe(201);
    expect(response.body.valorTotal).toBe(40);
  });

  it('bloqueia o dono tentando alugar o próprio item (RN04) com 400', async () => {
    (prisma.item.findFirst as jest.Mock).mockResolvedValue(itemBase);
    const app = createApp();

    const response = await request(app)
      .post('/api/locacoes')
      .set('Authorization', `Bearer ${token(OWNER_ID)}`)
      .send({ itemId: 'item-1', dataInicio: '2026-10-01', dataFim: '2026-10-03' });

    expect(response.status).toBe(400);
    expect(prisma.locacao.create).not.toHaveBeenCalled();
  });

  it('rejeita corpo inválido (datas ausentes) com 400', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/locacoes')
      .set('Authorization', `Bearer ${token(LOCATARIO_ID)}`)
      .send({ itemId: 'item-1' });

    expect(response.status).toBe(400);
  });
});

describe('GET /api/locacoes/minhas e /recebidas', () => {
  it('lista as locações como locatário', async () => {
    (prisma.locacao.findMany as jest.Mock).mockResolvedValue([locacaoBase]);
    const app = createApp();

    const response = await request(app)
      .get('/api/locacoes/minhas')
      .set('Authorization', `Bearer ${token(LOCATARIO_ID)}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  it('lista as locações recebidas como proprietário', async () => {
    (prisma.locacao.findMany as jest.Mock).mockResolvedValue([locacaoBase]);
    const app = createApp();

    const response = await request(app)
      .get('/api/locacoes/recebidas')
      .set('Authorization', `Bearer ${token(OWNER_ID)}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });
});

describe('POST /api/locacoes/:id/aprovar e /rejeitar', () => {
  it('permite que o dono do item aprove a locação pendente', async () => {
    (prisma.locacao.findUnique as jest.Mock).mockResolvedValue(locacaoBase);
    (prisma.locacao.update as jest.Mock).mockResolvedValue({ ...locacaoBase, status: 'APROVADA' });
    const app = createApp();

    const response = await request(app)
      .post('/api/locacoes/locacao-1/aprovar')
      .set('Authorization', `Bearer ${token(OWNER_ID)}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('APROVADA');
  });

  it('bloqueia quem não é dono do item tentando aprovar, com 403', async () => {
    (prisma.locacao.findUnique as jest.Mock).mockResolvedValue(locacaoBase);
    const app = createApp();

    const response = await request(app)
      .post('/api/locacoes/locacao-1/aprovar')
      .set('Authorization', `Bearer ${token('user-estranho')}`);

    expect(response.status).toBe(403);
    expect(prisma.locacao.update).not.toHaveBeenCalled();
  });

  it('permite que o dono rejeite a locação pendente', async () => {
    (prisma.locacao.findUnique as jest.Mock).mockResolvedValue(locacaoBase);
    (prisma.locacao.update as jest.Mock).mockResolvedValue({
      ...locacaoBase,
      status: 'CANCELADA',
    });
    const app = createApp();

    const response = await request(app)
      .post('/api/locacoes/locacao-1/rejeitar')
      .set('Authorization', `Bearer ${token(OWNER_ID)}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('CANCELADA');
  });

  it('retorna 404 quando a locação não existe', async () => {
    (prisma.locacao.findUnique as jest.Mock).mockResolvedValue(null);
    const app = createApp();

    const response = await request(app)
      .post('/api/locacoes/inexistente/aprovar')
      .set('Authorization', `Bearer ${token(OWNER_ID)}`);

    expect(response.status).toBe(404);
  });
});
