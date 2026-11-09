import jwt from 'jsonwebtoken';
import request from 'supertest';

jest.mock('@/common/prisma', () => ({
  prisma: {
    item: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    locacao: { findFirst: jest.fn(), create: jest.fn() },
  },
}));

import { createApp } from '@/app';
import { prisma } from '@/common/prisma';

const ACCESS_SECRET = 'test-access-secret';
const CONDOMINIO_ID = 'cond-1';
const PRESTADOR_ID = 'user-prestador';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
});

beforeEach(() => {
  jest.clearAllMocks();
});

function token(userId = PRESTADOR_ID): string {
  return jwt.sign({ userId, papel: 'MORADOR', condominioId: CONDOMINIO_ID }, ACCESS_SECRET, {
    expiresIn: '1h',
  });
}

const servicoBase = {
  id: 'serv-1',
  titulo: 'Eletricista residencial',
  descricao: 'Instalação de tomadas, chuveiros e troca de disjuntores.',
  categoria: 'Elétrica',
  valorDiaria: 80,
  tipo: 'SERVICO',
  unidadeCobranca: 'HORA',
  fabricante: null,
  modelo: null,
  numeroSerie: null,
  acessorios: null,
  ativo: true,
  ownerId: PRESTADOR_ID,
  condominioId: CONDOMINIO_ID,
  createdAt: new Date('2026-11-09'),
  updatedAt: new Date('2026-11-09'),
  imagens: [],
  owner: { nome: 'Raquel Vieira', apartamento: '12' },
};

const corpoServico = {
  tipo: 'SERVICO',
  unidadeCobranca: 'HORA',
  titulo: 'Eletricista residencial',
  descricao: 'Instalação de tomadas, chuveiros e troca de disjuntores.',
  categoria: 'Elétrica',
  valorDiaria: 80,
};

describe('POST /api/itens (serviço)', () => {
  it('publica um serviço cobrado por hora e devolve quem presta', async () => {
    (prisma.item.create as jest.Mock).mockResolvedValue(servicoBase);

    const response = await request(createApp())
      .post('/api/itens')
      .set('Authorization', `Bearer ${token()}`)
      .send(corpoServico);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      tipo: 'SERVICO',
      unidadeCobranca: 'HORA',
      valorDiaria: 80,
      proprietario: { nome: 'Raquel Vieira', apartamento: '12' },
    });
    expect(prisma.item.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tipo: 'SERVICO', unidadeCobranca: 'HORA' }),
      }),
    );
  });

  it('serviço não tem piso de R$ 5,00 (não é cobrado pela plataforma)', async () => {
    (prisma.item.create as jest.Mock).mockResolvedValue({ ...servicoBase, valorDiaria: 3 });

    const response = await request(createApp())
      .post('/api/itens')
      .set('Authorization', `Bearer ${token()}`)
      .send({ ...corpoServico, valorDiaria: 3 });

    expect(response.status).toBe(201);
  });

  it('serviço precisa dizer se é cobrado por hora ou por serviço', async () => {
    const { unidadeCobranca, ...semUnidade } = corpoServico;
    void unidadeCobranca;

    const response = await request(createApp())
      .post('/api/itens')
      .set('Authorization', `Bearer ${token()}`)
      .send(semUnidade);

    expect(response.status).toBe(400);
    expect(prisma.item.create).not.toHaveBeenCalled();
  });

  it('serviço não pode ser cobrado por dia', async () => {
    const response = await request(createApp())
      .post('/api/itens')
      .set('Authorization', `Bearer ${token()}`)
      .send({ ...corpoServico, unidadeCobranca: 'DIA' });

    expect(response.status).toBe(400);
  });

  it('ignora a identificação de bem (fabricante, modelo, série, acessórios) em serviço', async () => {
    (prisma.item.create as jest.Mock).mockResolvedValue(servicoBase);

    await request(createApp())
      .post('/api/itens')
      .set('Authorization', `Bearer ${token()}`)
      .send({ ...corpoServico, fabricante: 'Bosch', acessorios: ['Maleta'] });

    const { data } = (prisma.item.create as jest.Mock).mock.calls[0][0];
    expect(data.fabricante).toBeUndefined();
    expect(data.acessorios).toBeUndefined();
  });

  it('um item continua sendo cobrado por dia, com piso de R$ 5,00', async () => {
    const response = await request(createApp())
      .post('/api/itens')
      .set('Authorization', `Bearer ${token()}`)
      .send({ ...corpoServico, tipo: 'ITEM', unidadeCobranca: 'DIA', valorDiaria: 2 });

    expect(response.status).toBe(400);
  });

  it('um item não pode ser cobrado por hora', async () => {
    const response = await request(createApp())
      .post('/api/itens')
      .set('Authorization', `Bearer ${token()}`)
      .send({ ...corpoServico, tipo: 'ITEM', unidadeCobranca: 'HORA', valorDiaria: 20 });

    expect(response.status).toBe(400);
  });
});

describe('GET /api/itens (filtro por tipo)', () => {
  it('lista só os serviços quando pedido', async () => {
    (prisma.item.findMany as jest.Mock).mockResolvedValue([servicoBase]);

    const response = await request(createApp())
      .get('/api/itens?tipo=SERVICO')
      .set('Authorization', `Bearer ${token('outra-pessoa')}`);

    expect(response.status).toBe(200);
    expect(response.body[0].tipo).toBe('SERVICO');
    expect((prisma.item.findMany as jest.Mock).mock.calls[0][0].where).toMatchObject({
      condominioId: CONDOMINIO_ID,
      ativo: true,
      tipo: 'SERVICO',
    });
  });

  it('sem filtro de tipo, lista tudo', async () => {
    (prisma.item.findMany as jest.Mock).mockResolvedValue([]);

    await request(createApp())
      .get('/api/itens')
      .set('Authorization', `Bearer ${token('outra-pessoa')}`);

    expect((prisma.item.findMany as jest.Mock).mock.calls[0][0].where).not.toHaveProperty('tipo');
  });

  it('recusa um tipo que não existe', async () => {
    const response = await request(createApp())
      .get('/api/itens?tipo=OUTRO')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(400);
  });
});

describe('PATCH /api/itens/:id (serviço)', () => {
  it('o prestador muda o valor e a unidade do serviço', async () => {
    (prisma.item.findUnique as jest.Mock).mockResolvedValue(servicoBase);
    (prisma.item.update as jest.Mock).mockResolvedValue({
      ...servicoBase,
      valorDiaria: 150,
      unidadeCobranca: 'SERVICO',
    });

    const response = await request(createApp())
      .patch('/api/itens/serv-1')
      .set('Authorization', `Bearer ${token()}`)
      .send({ valorDiaria: 150, unidadeCobranca: 'SERVICO' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ valorDiaria: 150, unidadeCobranca: 'SERVICO' });
  });

  it('serviço não aceita virar "por dia"', async () => {
    (prisma.item.findUnique as jest.Mock).mockResolvedValue(servicoBase);

    const response = await request(createApp())
      .patch('/api/itens/serv-1')
      .set('Authorization', `Bearer ${token()}`)
      .send({ unidadeCobranca: 'DIA' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('UNIDADE_INVALIDA');
  });

  it('item não aceita virar "por hora", e o serviço não herda o piso de R$ 5,00', async () => {
    (prisma.item.findUnique as jest.Mock).mockResolvedValue({
      ...servicoBase,
      tipo: 'ITEM',
      unidadeCobranca: 'DIA',
    });

    const comoItem = await request(createApp())
      .patch('/api/itens/serv-1')
      .set('Authorization', `Bearer ${token()}`)
      .send({ unidadeCobranca: 'HORA' });
    expect(comoItem.status).toBe(400);

    (prisma.item.findUnique as jest.Mock).mockResolvedValue(servicoBase);
    (prisma.item.update as jest.Mock).mockResolvedValue({ ...servicoBase, valorDiaria: 2 });
    const comoServico = await request(createApp())
      .patch('/api/itens/serv-1')
      .set('Authorization', `Bearer ${token()}`)
      .send({ valorDiaria: 2 });
    expect(comoServico.status).toBe(200);
  });
});

describe('serviço não se aluga', () => {
  it('pedir a locação de um serviço devolve 400 e orienta a conversar com quem presta', async () => {
    (prisma.item.findFirst as jest.Mock).mockResolvedValue(servicoBase);

    const response = await request(createApp())
      .post('/api/locacoes')
      .set('Authorization', `Bearer ${token('morador-interessado')}`)
      .send({
        itemId: '11111111-1111-4111-8111-111111111111',
        dataInicio: '2026-12-10',
        dataFim: '2026-12-12',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('SERVICO_NAO_ALUGAVEL');
    expect(prisma.locacao.create).not.toHaveBeenCalled();
  });
});
