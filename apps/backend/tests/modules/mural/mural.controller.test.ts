import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('@/common/prisma', () => ({
  prisma: {
    post: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    comentarioPost: { create: jest.fn() },
    condominio: { findUnique: jest.fn() },
  },
}));

import { createApp } from '@/app';
import { prisma } from '@/common/prisma';

const ACCESS_SECRET = 'test-access-secret';
const CONDOMINIO_ID = 'cond-1';
const AUTOR_ID = 'user-ana';
const SINDICO_ID = 'user-sindico';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
});

beforeEach(() => {
  jest.clearAllMocks();
});

function token(userId: string, papel: 'MORADOR' | 'SINDICO' = 'MORADOR'): string {
  return jwt.sign({ userId, papel, condominioId: CONDOMINIO_ID }, ACCESS_SECRET, {
    expiresIn: '1h',
  });
}

const autor = { id: AUTOR_ID, nome: 'Ana Proprietaria', papel: 'MORADOR' };

const postBase = {
  id: 'post-1',
  conteudo: 'Preciso de uma escada',
  tipo: 'PEDIDO',
  categoria: 'Ferramentas',
  status: 'ABERTO',
  autorId: AUTOR_ID,
  condominioId: CONDOMINIO_ID,
  createdAt: new Date('2026-09-16'),
  updatedAt: new Date('2026-09-16'),
  autor,
};

describe('POST /api/mural', () => {
  it('cria um post e retorna 201', async () => {
    (prisma.post.create as jest.Mock).mockResolvedValue(postBase);
    const app = createApp();

    const response = await request(app)
      .post('/api/mural')
      .set('Authorization', `Bearer ${token(AUTOR_ID)}`)
      .send({ conteudo: 'Preciso de uma escada', tipo: 'PEDIDO', categoria: 'Ferramentas' });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('ABERTO');
  });

  it('rejeita conteúdo muito curto com 400', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/mural')
      .set('Authorization', `Bearer ${token(AUTOR_ID)}`)
      .send({ conteudo: 'oi' });

    expect(response.status).toBe(400);
  });
});

describe('GET /api/mural', () => {
  it('lista os posts do condomínio', async () => {
    (prisma.post.findMany as jest.Mock).mockResolvedValue([
      { ...postBase, _count: { comentarios: 2 } },
    ]);
    const app = createApp();

    const response = await request(app)
      .get('/api/mural')
      .set('Authorization', `Bearer ${token(AUTOR_ID)}`);

    expect(response.status).toBe(200);
    expect(response.body[0].comentariosCount).toBe(2);
  });
});

describe('GET /api/mural/:id', () => {
  it('retorna o post com os comentários', async () => {
    (prisma.post.findFirst as jest.Mock).mockResolvedValue({ ...postBase, comentarios: [] });
    const app = createApp();

    const response = await request(app)
      .get('/api/mural/post-1')
      .set('Authorization', `Bearer ${token(AUTOR_ID)}`);

    expect(response.status).toBe(200);
    expect(response.body.comentarios).toEqual([]);
  });

  it('retorna 404 quando o post não existe', async () => {
    (prisma.post.findFirst as jest.Mock).mockResolvedValue(null);
    const app = createApp();

    const response = await request(app)
      .get('/api/mural/inexistente')
      .set('Authorization', `Bearer ${token(AUTOR_ID)}`);

    expect(response.status).toBe(404);
  });
});

describe('POST /api/mural/:id/respostas', () => {
  it('publica um comentário e retorna 201', async () => {
    (prisma.post.findFirst as jest.Mock).mockResolvedValue(postBase);
    (prisma.comentarioPost.create as jest.Mock).mockResolvedValue({
      id: 'comentario-1',
      postId: 'post-1',
      autorId: SINDICO_ID,
      conteudo: 'Tenho uma, te empresto!',
      createdAt: new Date('2026-09-16'),
      autor: { id: SINDICO_ID, nome: 'Carla Síndica', papel: 'SINDICO' },
    });
    const app = createApp();

    const response = await request(app)
      .post('/api/mural/post-1/respostas')
      .set('Authorization', `Bearer ${token(SINDICO_ID, 'SINDICO')}`)
      .send({ conteudo: 'Tenho uma, te empresto!' });

    expect(response.status).toBe(201);
    expect(response.body.conteudo).toBe('Tenho uma, te empresto!');
  });
});

describe('POST /api/mural/:id/atender', () => {
  it('permite que o autor marque o pedido como atendido', async () => {
    (prisma.post.findFirst as jest.Mock).mockResolvedValue(postBase);
    (prisma.post.update as jest.Mock).mockResolvedValue({
      ...postBase,
      status: 'ATENDIDO',
      _count: { comentarios: 0 },
    });
    const app = createApp();

    const response = await request(app)
      .post('/api/mural/post-1/atender')
      .set('Authorization', `Bearer ${token(AUTOR_ID)}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ATENDIDO');
  });

  it('bloqueia quem não é autor com 403', async () => {
    (prisma.post.findFirst as jest.Mock).mockResolvedValue(postBase);
    const app = createApp();

    const response = await request(app)
      .post('/api/mural/post-1/atender')
      .set('Authorization', `Bearer ${token('user-estranho')}`);

    expect(response.status).toBe(403);
    expect(prisma.post.update).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/mural/:id', () => {
  it('permite que o síndico exclua qualquer post do condomínio', async () => {
    (prisma.post.findFirst as jest.Mock).mockResolvedValue(postBase);
    const app = createApp();

    const response = await request(app)
      .delete('/api/mural/post-1')
      .set('Authorization', `Bearer ${token(SINDICO_ID, 'SINDICO')}`);

    expect(response.status).toBe(204);
    expect(prisma.post.delete).toHaveBeenCalledWith({ where: { id: 'post-1' } });
  });

  it('bloqueia morador que não é autor com 403', async () => {
    (prisma.post.findFirst as jest.Mock).mockResolvedValue(postBase);
    const app = createApp();

    const response = await request(app)
      .delete('/api/mural/post-1')
      .set('Authorization', `Bearer ${token('user-estranho')}`);

    expect(response.status).toBe(403);
    expect(prisma.post.delete).not.toHaveBeenCalled();
  });
});
