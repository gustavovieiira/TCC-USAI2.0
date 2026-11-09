import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('@/common/prisma', () => ({
  prisma: {
    cobrancaAssinatura: { findMany: jest.fn().mockResolvedValue([]) },
    despesaPlataforma: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    assinatura: { findMany: jest.fn().mockResolvedValue([]) },
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

function token(papel: 'ADMIN' | 'SINDICO' | 'MORADOR' = 'ADMIN'): string {
  return jwt.sign({ userId: 'admin-1', papel, condominioId: null }, ACCESS_SECRET, {
    expiresIn: '1h',
  });
}

const despesaValida = {
  data: '2026-11-05',
  valor: 60,
  descricao: 'Servidor da DigitalOcean',
  categoria: 'SERVIDOR',
};

describe('rotas do financeiro da plataforma: só o Admin', () => {
  it.each([
    ['get', '/api/admin/plataforma/vendas'],
    ['get', '/api/admin/plataforma/assinaturas'],
    ['post', '/api/admin/plataforma/despesas'],
    ['delete', '/api/admin/plataforma/despesas/d-1'],
  ] as const)('%s %s: sem login dá 401 e síndico ou morador dão 403', async (metodo, rota) => {
    const app = createApp();

    expect((await request(app)[metodo](rota)).status).toBe(401);
    for (const papel of ['SINDICO', 'MORADOR'] as const) {
      const resposta = await request(app)
        [metodo](rota)
        .set('Authorization', `Bearer ${token(papel)}`);
      expect(resposta.status).toBe(403);
    }
  });
});

describe('GET /api/admin/plataforma/vendas', () => {
  it('devolve o resumo do mês pedido', async () => {
    const resposta = await request(createApp())
      .get('/api/admin/plataforma/vendas?mes=2026-11')
      .set('Authorization', `Bearer ${token()}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.mes).toBe('2026-11');
    expect(resposta.body.resumo).toMatchObject({ entrou: 0, resultado: 0, pagamentos: 0 });
  });

  it.each([['2026-13'], ['2026-00'], ['26-11'], ['novembro'], ['2026-1']])(
    'recusa o mês inválido %p com 400',
    async (mes) => {
      const resposta = await request(createApp())
        .get(`/api/admin/plataforma/vendas?mes=${mes}`)
        .set('Authorization', `Bearer ${token()}`);

      expect(resposta.status).toBe(400);
      expect(prisma.cobrancaAssinatura.findMany).not.toHaveBeenCalled();
    },
  );
});

describe('GET /api/admin/plataforma/assinaturas', () => {
  it('devolve o resumo e a lista', async () => {
    const resposta = await request(createApp())
      .get('/api/admin/plataforma/assinaturas')
      .set('Authorization', `Bearer ${token()}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.resumo.total).toBe(0);
    expect(resposta.body.itens).toEqual([]);
  });
});

describe('POST /api/admin/plataforma/despesas', () => {
  it('lança a despesa e responde 201', async () => {
    (prisma.despesaPlataforma.create as jest.Mock).mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: 'd-1', ...data }),
    );

    const resposta = await request(createApp())
      .post('/api/admin/plataforma/despesas')
      .set('Authorization', `Bearer ${token()}`)
      .send(despesaValida);

    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({ id: 'd-1', valor: 60, categoria: 'SERVIDOR' });
    expect((prisma.despesaPlataforma.create as jest.Mock).mock.calls[0][0].data.criadoPorId).toBe(
      'admin-1',
    );
  });

  it.each([
    ['valor zero', { valor: 0 }],
    ['valor negativo', { valor: -5 }],
    ['3 casas decimais', { valor: 1.234 }],
    ['valor como texto', { valor: '60' }],
    ['valor alto demais', { valor: 2_000_000 }],
    ['descrição curta', { descricao: 'ab' }],
    ['descrição enorme', { descricao: 'x'.repeat(121) }],
    ['categoria que não existe', { categoria: 'LUXO' }],
    ['data em outro formato', { data: '05/11/2026' }],
    ['data que não existe', { data: '2026-02-30' }],
  ])('recusa %s com 400 e não grava nada', async (_nome, troca) => {
    const resposta = await request(createApp())
      .post('/api/admin/plataforma/despesas')
      .set('Authorization', `Bearer ${token()}`)
      .send({ ...despesaValida, ...troca });

    expect(resposta.status).toBe(400);
    expect(prisma.despesaPlataforma.create).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/admin/plataforma/despesas/:id', () => {
  it('apaga e responde 204', async () => {
    (prisma.despesaPlataforma.findUnique as jest.Mock).mockResolvedValue({ id: 'd-1' });

    const resposta = await request(createApp())
      .delete('/api/admin/plataforma/despesas/d-1')
      .set('Authorization', `Bearer ${token()}`);

    expect(resposta.status).toBe(204);
    expect(prisma.despesaPlataforma.delete).toHaveBeenCalledWith({ where: { id: 'd-1' } });
  });

  it('despesa que não existe dá 404', async () => {
    (prisma.despesaPlataforma.findUnique as jest.Mock).mockResolvedValue(null);

    const resposta = await request(createApp())
      .delete('/api/admin/plataforma/despesas/nada')
      .set('Authorization', `Bearer ${token()}`);

    expect(resposta.status).toBe(404);
  });
});
