import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('@/common/prisma', () => ({
  prisma: {
    locacao: { findUnique: jest.fn() },
    mensagem: { create: jest.fn(), findMany: jest.fn() },
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

const locacaoComItem = {
  id: 'locacao-1',
  locatarioId: LOCATARIO_ID,
  item: { id: 'item-1', ownerId: OWNER_ID },
};

const mensagemBase = {
  id: 'mensagem-1',
  locacaoId: 'locacao-1',
  remetenteId: LOCATARIO_ID,
  conteudo: 'Posso pegar às 18h?',
  createdAt: new Date('2026-09-16'),
};

describe('POST /api/locacoes/:id/mensagens', () => {
  it('envia a mensagem quando o remetente participa da locação', async () => {
    (prisma.locacao.findUnique as jest.Mock).mockResolvedValue(locacaoComItem);
    (prisma.mensagem.create as jest.Mock).mockResolvedValue(mensagemBase);
    const app = createApp();

    const response = await request(app)
      .post('/api/locacoes/locacao-1/mensagens')
      .set('Authorization', `Bearer ${token(LOCATARIO_ID)}`)
      .send({ conteudo: 'Posso pegar às 18h?' });

    expect(response.status).toBe(201);
    expect(response.body.conteudo).toBe('Posso pegar às 18h?');
  });

  it('bloqueia quem não participa da locação com 403', async () => {
    (prisma.locacao.findUnique as jest.Mock).mockResolvedValue(locacaoComItem);
    const app = createApp();

    const response = await request(app)
      .post('/api/locacoes/locacao-1/mensagens')
      .set('Authorization', `Bearer ${token('user-estranho')}`)
      .send({ conteudo: 'Oi' });

    expect(response.status).toBe(403);
    expect(prisma.mensagem.create).not.toHaveBeenCalled();
  });

  it('rejeita mensagem vazia com 400', async () => {
    (prisma.locacao.findUnique as jest.Mock).mockResolvedValue(locacaoComItem);
    const app = createApp();

    const response = await request(app)
      .post('/api/locacoes/locacao-1/mensagens')
      .set('Authorization', `Bearer ${token(LOCATARIO_ID)}`)
      .send({ conteudo: '' });

    expect(response.status).toBe(400);
  });
});

describe('GET /api/locacoes/:id/mensagens', () => {
  it('lista o histórico em ordem cronológica pra um participante', async () => {
    (prisma.locacao.findUnique as jest.Mock).mockResolvedValue(locacaoComItem);
    (prisma.mensagem.findMany as jest.Mock).mockResolvedValue([mensagemBase]);
    const app = createApp();

    const response = await request(app)
      .get('/api/locacoes/locacao-1/mensagens')
      .set('Authorization', `Bearer ${token(OWNER_ID)}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  it('retorna 404 quando a locação não existe', async () => {
    (prisma.locacao.findUnique as jest.Mock).mockResolvedValue(null);
    const app = createApp();

    const response = await request(app)
      .get('/api/locacoes/inexistente/mensagens')
      .set('Authorization', `Bearer ${token(OWNER_ID)}`);

    expect(response.status).toBe(404);
  });
});
