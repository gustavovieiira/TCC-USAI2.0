import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('@/common/prisma', () => ({
  prisma: {
    condominio: { findUnique: jest.fn(), update: jest.fn() },
    user: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    locacao: { findMany: jest.fn() },
  },
}));

import { createApp } from '@/app';
import { prisma } from '@/common/prisma';

const ACCESS_SECRET = 'test-access-secret';
const CONDOMINIO_ID = 'cond-1';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
});

beforeEach(() => {
  jest.clearAllMocks();
});

function token(): string {
  return jwt.sign(
    { userId: 'user-sindico', papel: 'SINDICO', condominioId: CONDOMINIO_ID },
    ACCESS_SECRET,
    { expiresIn: '1h' },
  );
}

const condominioBase = {
  id: CONDOMINIO_ID,
  nome: 'Residencial Jardim Europa',
  linkSlug: 'residencial-jardim-europa',
  pin: '1234',
  ativo: true,
  createdAt: new Date('2026-09-16'),
  updatedAt: new Date('2026-09-16'),
};

describe('GET /api/sindico/condominio', () => {
  it('retorna os dados do condomínio', async () => {
    (prisma.condominio.findUnique as jest.Mock).mockResolvedValue(condominioBase);
    const app = createApp();

    const response = await request(app)
      .get('/api/sindico/condominio')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body.linkSlug).toBe('residencial-jardim-europa');
  });

  it('retorna 404 quando o condomínio não existe mais', async () => {
    (prisma.condominio.findUnique as jest.Mock).mockResolvedValue(null);
    const app = createApp();

    const response = await request(app)
      .get('/api/sindico/condominio')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(404);
  });
});

describe('PATCH /api/sindico/condominio/pin', () => {
  it('atualiza o PIN do condomínio', async () => {
    (prisma.condominio.findUnique as jest.Mock).mockResolvedValue(condominioBase);
    (prisma.condominio.update as jest.Mock).mockResolvedValue({ ...condominioBase, pin: '5678' });
    const app = createApp();

    const response = await request(app)
      .patch('/api/sindico/condominio/pin')
      .set('Authorization', `Bearer ${token()}`)
      .send({ pin: '5678' });

    expect(response.status).toBe(200);
    expect(response.body.pin).toBe('5678');
  });

  it('rejeita PIN em formato inválido com 400', async () => {
    const app = createApp();

    const response = await request(app)
      .patch('/api/sindico/condominio/pin')
      .set('Authorization', `Bearer ${token()}`)
      .send({ pin: 'abc' });

    expect(response.status).toBe(400);
  });
});

describe('GET /api/sindico/moradores', () => {
  it('lista os moradores do condomínio', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'user-1',
        nome: 'Ana',
        email: 'ana@example.com',
        apartamento: '101',
        createdAt: new Date(),
      },
    ]);
    const app = createApp();

    const response = await request(app)
      .get('/api/sindico/moradores')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });
});

describe('DELETE /api/sindico/moradores/:id', () => {
  it('remove (desativa) um morador do próprio condomínio', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      papel: 'MORADOR',
      condominioId: CONDOMINIO_ID,
    });
    const app = createApp();

    const response = await request(app)
      .delete('/api/sindico/moradores/user-1')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(204);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { ativo: false },
    });
  });

  it('retorna 404 pra morador de outro condomínio', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      papel: 'MORADOR',
      condominioId: 'outro-cond',
    });
    const app = createApp();

    const response = await request(app)
      .delete('/api/sindico/moradores/user-1')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(404);
  });
});

describe('GET /api/sindico/locacoes', () => {
  it('lista as locações ativas do condomínio', async () => {
    (prisma.locacao.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'locacao-1',
        status: 'APROVADA',
        dataInicio: new Date('2026-10-01'),
        dataFim: new Date('2026-10-03'),
        valorTotal: 40,
        item: { id: 'item-1', titulo: 'Furadeira', ownerId: 'user-dono' },
        locatario: { id: 'user-locatario', nome: 'Bruno' },
      },
    ]);
    const app = createApp();

    const response = await request(app)
      .get('/api/sindico/locacoes')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });
});
