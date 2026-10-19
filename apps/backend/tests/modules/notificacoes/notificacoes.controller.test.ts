import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('@/common/prisma', () => ({
  prisma: {
    notificacao: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      updateMany: jest.fn(),
    },
  },
}));

import { createApp } from '@/app';
import { prisma } from '@/common/prisma';

const ACCESS_SECRET = 'test-access-secret';
const USER_ID = 'user-1';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
});

beforeEach(() => {
  jest.clearAllMocks();
});

function token(userId = USER_ID) {
  return jwt.sign({ userId, papel: 'MORADOR', condominioId: 'cond-1' }, ACCESS_SECRET, {
    expiresIn: '1h',
  });
}

describe('GET /api/notificacoes', () => {
  it('lista as notificações do usuário do token e a contagem de não lidas', async () => {
    (prisma.notificacao.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'n-1',
        userId: USER_ID,
        tipo: 'SAQUE_APROVADO',
        titulo: 'Saque aprovado',
        mensagem: 'x',
        link: '/saques',
        lida: false,
        createdAt: new Date('2026-10-19'),
      },
    ]);
    (prisma.notificacao.count as jest.Mock).mockResolvedValue(1);

    const response = await request(createApp())
      .get('/api/notificacoes')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body.naoLidas).toBe(1);
    expect(response.body.notificacoes[0].titulo).toBe('Saque aprovado');
    expect(prisma.notificacao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } }),
    );
  });

  it('exige autenticação', async () => {
    const response = await request(createApp()).get('/api/notificacoes');

    expect(response.status).toBe(401);
  });
});

describe('POST /api/notificacoes/:id/lida', () => {
  it('marca como lida e responde 204', async () => {
    (prisma.notificacao.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const response = await request(createApp())
      .post('/api/notificacoes/n-1/lida')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(204);
    expect(prisma.notificacao.updateMany).toHaveBeenCalledWith({
      where: { id: 'n-1', userId: USER_ID },
      data: { lida: true },
    });
  });

  it('retorna 404 quando a notificação é de outra pessoa', async () => {
    (prisma.notificacao.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    const response = await request(createApp())
      .post('/api/notificacoes/n-alheia/lida')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(404);
  });
});

describe('POST /api/notificacoes/ler-todas', () => {
  it('marca todas as do usuário como lidas e responde 204', async () => {
    (prisma.notificacao.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

    const response = await request(createApp())
      .post('/api/notificacoes/ler-todas')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(204);
    expect(prisma.notificacao.updateMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, lida: false },
      data: { lida: true },
    });
  });
});
