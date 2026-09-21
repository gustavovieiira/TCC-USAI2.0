import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('@/common/prisma', () => ({
  prisma: {
    user: { findFirst: jest.fn(), findMany: jest.fn() },
    conversaPrivada: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    mensagemPrivada: { create: jest.fn(), findMany: jest.fn() },
  },
}));

import { createApp } from '@/app';
import { prisma } from '@/common/prisma';

const ACCESS_SECRET = 'test-access-secret';
const CONDOMINIO_ID = 'cond-1';
const ANA_ID = '22222222-2222-2222-2222-222222222222';
const BRUNO_ID = '33333333-3333-3333-3333-333333333333';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
});

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.conversaPrivada.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
});

function token(userId: string): string {
  return jwt.sign({ userId, papel: 'MORADOR', condominioId: CONDOMINIO_ID }, ACCESS_SECRET, {
    expiresIn: '1h',
  });
}

/** Admin não está vinculado a nenhum condomínio — token sem `condominioId`. */
function tokenSemCondominio(userId: string): string {
  return jwt.sign({ userId, papel: 'ADMIN', condominioId: null }, ACCESS_SECRET, {
    expiresIn: '1h',
  });
}

const ana = { id: ANA_ID, nome: 'Ana Proprietaria', papel: 'MORADOR' };
const bruno = { id: BRUNO_ID, nome: 'Bruno Locatario', papel: 'MORADOR' };

const conversaBase = {
  id: 'conversa-1',
  postOrigemId: null,
  participanteAId: ANA_ID,
  participanteBId: BRUNO_ID,
  condominioId: CONDOMINIO_ID,
  createdAt: new Date('2026-09-16'),
  expiraEm: new Date('2026-09-23'),
  participanteA: ana,
  participanteB: bruno,
};

describe('POST /api/conversas', () => {
  it('abre uma conversa nova e retorna 201', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(bruno);
    (prisma.conversaPrivada.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.conversaPrivada.create as jest.Mock).mockResolvedValue(conversaBase);
    const app = createApp();

    const response = await request(app)
      .post('/api/conversas')
      .set('Authorization', `Bearer ${token(ANA_ID)}`)
      .send({ usuarioId: BRUNO_ID });

    expect(response.status).toBe(201);
    expect(response.body.outroParticipante.id).toBe(BRUNO_ID);
  });

  it('rejeita abrir conversa com um usuário inexistente com 404', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    const app = createApp();

    const response = await request(app)
      .post('/api/conversas')
      .set('Authorization', `Bearer ${token(ANA_ID)}`)
      .send({ usuarioId: '11111111-1111-1111-1111-111111111111' });

    expect(response.status).toBe(404);
  });

  it('rejeita corpo inválido (usuarioId que não é UUID) com 400', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/conversas')
      .set('Authorization', `Bearer ${token(ANA_ID)}`)
      .send({ usuarioId: 'não-é-um-uuid' });

    expect(response.status).toBe(400);
  });

  it('rejeita quem não está vinculado a um condomínio (ex.: Admin USAI) com 403', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/conversas')
      .set('Authorization', `Bearer ${tokenSemCondominio('admin-1')}`)
      .send({ usuarioId: BRUNO_ID });

    expect(response.status).toBe(403);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });
});

describe('GET /api/conversas', () => {
  it('lista as conversas do usuário autenticado', async () => {
    (prisma.conversaPrivada.findMany as jest.Mock).mockResolvedValue([
      { ...conversaBase, mensagens: [] },
    ]);
    const app = createApp();

    const response = await request(app)
      .get('/api/conversas')
      .set('Authorization', `Bearer ${token(ANA_ID)}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });
});

describe('GET /api/conversas/usuarios', () => {
  it('lista os usuários do condomínio, exceto quem busca', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([bruno]);
    const app = createApp();

    const response = await request(app)
      .get('/api/conversas/usuarios')
      .set('Authorization', `Bearer ${token(ANA_ID)}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: BRUNO_ID, nome: 'Bruno Locatario', papel: 'MORADOR' }]);
  });
});

describe('GET /api/conversas/:id', () => {
  it('retorna a conversa quando o usuário participa', async () => {
    (prisma.conversaPrivada.findFirst as jest.Mock).mockResolvedValue(conversaBase);
    const app = createApp();

    const response = await request(app)
      .get('/api/conversas/conversa-1')
      .set('Authorization', `Bearer ${token(ANA_ID)}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe('conversa-1');
  });

  it('retorna 404 quando a conversa não existe', async () => {
    (prisma.conversaPrivada.findFirst as jest.Mock).mockResolvedValue(null);
    const app = createApp();

    const response = await request(app)
      .get('/api/conversas/inexistente')
      .set('Authorization', `Bearer ${token(ANA_ID)}`);

    expect(response.status).toBe(404);
  });

  it('bloqueia quem não participa da conversa com 403', async () => {
    (prisma.conversaPrivada.findFirst as jest.Mock).mockResolvedValue(conversaBase);
    const app = createApp();

    const response = await request(app)
      .get('/api/conversas/conversa-1')
      .set('Authorization', `Bearer ${token('user-estranho')}`);

    expect(response.status).toBe(403);
  });
});

describe('GET e POST /api/conversas/:id/mensagens', () => {
  it('lista o histórico de mensagens', async () => {
    (prisma.conversaPrivada.findFirst as jest.Mock).mockResolvedValue(conversaBase);
    (prisma.mensagemPrivada.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'msg-1',
        conversaId: 'conversa-1',
        remetenteId: ANA_ID,
        conteudo: 'Oi!',
        createdAt: new Date('2026-09-16'),
      },
    ]);
    const app = createApp();

    const response = await request(app)
      .get('/api/conversas/conversa-1/mensagens')
      .set('Authorization', `Bearer ${token(ANA_ID)}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  it('envia uma mensagem e retorna 201', async () => {
    (prisma.conversaPrivada.findFirst as jest.Mock).mockResolvedValue(conversaBase);
    (prisma.mensagemPrivada.create as jest.Mock).mockResolvedValue({
      id: 'msg-2',
      conversaId: 'conversa-1',
      remetenteId: BRUNO_ID,
      conteudo: 'Consigo te ajudar!',
      createdAt: new Date('2026-09-16'),
    });
    const app = createApp();

    const response = await request(app)
      .post('/api/conversas/conversa-1/mensagens')
      .set('Authorization', `Bearer ${token(BRUNO_ID)}`)
      .send({ conteudo: 'Consigo te ajudar!' });

    expect(response.status).toBe(201);
    expect(response.body.conteudo).toBe('Consigo te ajudar!');
  });
});
