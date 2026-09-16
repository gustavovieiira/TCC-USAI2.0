import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('@/common/prisma', () => ({
  prisma: {
    item: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { createApp } from '@/app';
import { prisma } from '@/common/prisma';

const ACCESS_SECRET = 'test-access-secret';
const CONDOMINIO_ID = 'cond-1';
const OWNER_ID = 'user-dono';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
});

beforeEach(() => {
  jest.clearAllMocks();
});

function token(userId = OWNER_ID): string {
  return jwt.sign({ userId, papel: 'MORADOR', condominioId: CONDOMINIO_ID }, ACCESS_SECRET, {
    expiresIn: '1h',
  });
}

const itemBase = {
  id: 'item-1',
  titulo: 'Furadeira Bosch',
  descricao: 'Furadeira de impacto em ótimo estado',
  categoria: 'Ferramentas',
  valorDiaria: 20,
  ativo: true,
  ownerId: OWNER_ID,
  condominioId: CONDOMINIO_ID,
  createdAt: new Date('2026-09-16'),
  updatedAt: new Date('2026-09-16'),
  imagens: [],
};

describe('POST /api/itens', () => {
  it('cria um item e retorna 201', async () => {
    (prisma.item.create as jest.Mock).mockResolvedValue(itemBase);
    const app = createApp();

    const response = await request(app)
      .post('/api/itens')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        titulo: 'Furadeira Bosch',
        descricao: 'Furadeira de impacto em ótimo estado',
        categoria: 'Ferramentas',
        valorDiaria: 20,
      });

    expect(response.status).toBe(201);
    expect(response.body.titulo).toBe('Furadeira Bosch');
    expect(prisma.item.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerId: OWNER_ID, condominioId: CONDOMINIO_ID }),
      }),
    );
  });

  it('rejeita corpo inválido com 400', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/itens')
      .set('Authorization', `Bearer ${token()}`)
      .send({ titulo: 'ab', descricao: 'curta', categoria: '', valorDiaria: -5 });

    expect(response.status).toBe(400);
    expect(prisma.item.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/itens', () => {
  it('lista os itens do condomínio, aplicando o filtro de categoria', async () => {
    (prisma.item.findMany as jest.Mock).mockResolvedValue([itemBase]);
    const app = createApp();

    const response = await request(app)
      .get('/api/itens?categoria=Ferramentas')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(prisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ condominioId: CONDOMINIO_ID, categoria: 'Ferramentas' }),
      }),
    );
  });
});

describe('GET /api/itens/:id', () => {
  it('retorna o item quando encontrado', async () => {
    (prisma.item.findFirst as jest.Mock).mockResolvedValue(itemBase);
    const app = createApp();

    const response = await request(app)
      .get('/api/itens/item-1')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe('item-1');
  });

  it('retorna 404 quando o item não existe no condomínio', async () => {
    (prisma.item.findFirst as jest.Mock).mockResolvedValue(null);
    const app = createApp();

    const response = await request(app)
      .get('/api/itens/inexistente')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(404);
  });
});

describe('PATCH /api/itens/:id', () => {
  it('permite que o dono atualize o próprio item', async () => {
    (prisma.item.findUnique as jest.Mock).mockResolvedValue(itemBase);
    (prisma.item.update as jest.Mock).mockResolvedValue({ ...itemBase, titulo: 'Novo título' });
    const app = createApp();

    const response = await request(app)
      .patch('/api/itens/item-1')
      .set('Authorization', `Bearer ${token(OWNER_ID)}`)
      .send({ titulo: 'Novo título' });

    expect(response.status).toBe(200);
    expect(response.body.titulo).toBe('Novo título');
  });

  it('bloqueia quem não é dono do item com 403', async () => {
    (prisma.item.findUnique as jest.Mock).mockResolvedValue(itemBase);
    const app = createApp();

    const response = await request(app)
      .patch('/api/itens/item-1')
      .set('Authorization', `Bearer ${token('outro-user')}`)
      .send({ titulo: 'Novo título' });

    expect(response.status).toBe(403);
    expect(prisma.item.update).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/itens/:id', () => {
  it('remove (logicamente) o item do dono e retorna 204', async () => {
    (prisma.item.findUnique as jest.Mock).mockResolvedValue(itemBase);
    (prisma.item.update as jest.Mock).mockResolvedValue({ ...itemBase, ativo: false });
    const app = createApp();

    const response = await request(app)
      .delete('/api/itens/item-1')
      .set('Authorization', `Bearer ${token(OWNER_ID)}`);

    expect(response.status).toBe(204);
    expect(prisma.item.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ativo: false } }),
    );
  });

  it('retorna 404 quando o item não existe', async () => {
    (prisma.item.findUnique as jest.Mock).mockResolvedValue(null);
    const app = createApp();

    const response = await request(app)
      .delete('/api/itens/inexistente')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(404);
  });
});
