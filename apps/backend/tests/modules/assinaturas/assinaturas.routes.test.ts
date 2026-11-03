import request from 'supertest';

jest.mock('@/modules/pagamentos/asaas.client');
jest.mock('@/modules/notificacoes/notificacoes.service');

jest.mock('@/common/prisma', () => {
  const mockPrisma = {
    assinatura: { findUnique: jest.fn() },
    user: { findUnique: jest.fn(), findFirst: jest.fn() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { prisma: mockPrisma };
});

import { createApp } from '@/app';
import { prisma } from '@/common/prisma';

const contratacaoValida = {
  planoCodigo: 'CONDOMINIO',
  periodoCodigo: 'MENSAL',
  nomeCondominio: 'Residencial Aurora',
  nomeSindico: 'Sílvia Souza',
  email: 'silvia@exemplo.com',
  cpfCnpj: '529.982.247-25',
  aceiteTermos: true,
};

describe('rotas públicas de assinatura', () => {
  const app = createApp();
  const original = process.env.PLANO_TESTE_ATIVO;

  // O resultado não pode depender do .env de quem roda os testes: o plano de teste começa desligado.
  beforeEach(() => {
    delete process.env.PLANO_TESTE_ATIVO;
  });

  afterAll(() => {
    if (original === undefined) delete process.env.PLANO_TESTE_ATIVO;
    else process.env.PLANO_TESTE_ATIVO = original;
  });

  it('com o modo de teste ligado, a lista pública inclui o plano de R$ 5,00 marcado como teste', async () => {
    process.env.PLANO_TESTE_ATIVO = 'true';

    const response = await request(app).get('/api/assinaturas/planos');

    const teste = response.body.planos.find((p: { codigo: string }) => p.codigo === 'TESTE');
    expect(teste).toMatchObject({ valorMensal: 5, limiteMoradores: 3, teste: true });
    expect(response.body.planos.filter((p: { teste: boolean }) => p.teste)).toHaveLength(1);
  });

  it('com o modo de teste desligado, contratar o plano de teste é recusado', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await request(app)
      .post('/api/assinaturas/contratar')
      .send({ ...contratacaoValida, planoCodigo: 'TESTE' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('PLANO_INVALIDO');
  });

  it('GET /api/assinaturas/planos lista os planos sem exigir login', async () => {
    const response = await request(app).get('/api/assinaturas/planos');

    expect(response.status).toBe(200);
    expect(response.body.planos.map((p: { codigo: string }) => p.codigo)).toEqual([
      'ESSENCIAL',
      'CONDOMINIO',
      'GRANDE',
      'PREMIUM',
    ]);
    expect(response.body.planos[0]).toMatchObject({ limiteMoradores: 20, valorMensal: 149 });
    expect(response.body.periodos.map((p: { codigo: string }) => p.codigo)).toEqual([
      'MENSAL',
      'TRIMESTRAL',
      'SEMESTRAL',
      'ANUAL',
    ]);
    // cada plano traz o preço em cada período (o anual de R$ 299/mês sai por R$ 2.870)
    const anual = response.body.planos[1].precos.find(
      (p: { periodoCodigo: string }) => p.periodoCodigo === 'ANUAL',
    );
    expect(anual).toMatchObject({ valorTotal: 2870, economia: 718 });
  });

  it.each([
    ['CPF/CNPJ inválido', { cpfCnpj: '111.111.111-11' }],
    ['e-mail inválido', { email: 'nao-e-email' }],
    ['sem aceite dos termos', { aceiteTermos: false }],
    ['nome do condomínio curto', { nomeCondominio: 'ab' }],
    ['sem período de cobrança', { periodoCodigo: '' }],
  ])('POST /api/assinaturas/contratar recusa %s com 400', async (_nome, alteracao) => {
    const response = await request(app)
      .post('/api/assinaturas/contratar')
      .send({ ...contratacaoValida, ...alteracao });

    expect(response.status).toBe(400);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('POST /api/assinaturas/contratar recusa plano inexistente com 400', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await request(app)
      .post('/api/assinaturas/contratar')
      .send({ ...contratacaoValida, planoCodigo: 'DIAMANTE' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('PLANO_INVALIDO');
  });

  it('POST /api/assinaturas/contratar recusa período inexistente com 400', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await request(app)
      .post('/api/assinaturas/contratar')
      .send({ ...contratacaoValida, periodoCodigo: 'QUINZENAL' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('PERIODO_INVALIDO');
  });

  it('GET /api/assinaturas/:id/status recusa id que não é UUID', async () => {
    const response = await request(app).get('/api/assinaturas/qualquer-coisa/status');

    expect(response.status).toBe(400);
    expect(prisma.assinatura.findUnique).not.toHaveBeenCalled();
  });

  it('GET /api/assinaturas/:id/status devolve 404 pra contratação que não existe', async () => {
    (prisma.assinatura.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await request(app).get(
      '/api/assinaturas/0b9c1d2e-3f4a-4b5c-8d6e-7f8091a2b3c4/status',
    );

    expect(response.status).toBe(404);
  });

  it('as rotas do painel do síndico exigem login', async () => {
    const response = await request(app).get('/api/sindico/assinatura');

    expect(response.status).toBe(401);
  });
});
