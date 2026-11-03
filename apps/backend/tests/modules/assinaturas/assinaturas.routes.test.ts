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
  nomeCondominio: 'Residencial Aurora',
  nomeSindico: 'Sílvia Souza',
  email: 'silvia@exemplo.com',
  cpfCnpj: '529.982.247-25',
  aceiteTermos: true,
};

describe('rotas públicas de assinatura', () => {
  const app = createApp();

  it('GET /api/assinaturas/planos lista os planos sem exigir login', async () => {
    const response = await request(app).get('/api/assinaturas/planos');

    expect(response.status).toBe(200);
    expect(response.body.map((p: { codigo: string }) => p.codigo)).toEqual([
      'ESSENCIAL',
      'CONDOMINIO',
      'GRANDE',
    ]);
    expect(response.body[0]).toMatchObject({ limiteMoradores: 30, valorMensal: 49 });
  });

  it.each([
    ['CPF/CNPJ inválido', { cpfCnpj: '111.111.111-11' }],
    ['e-mail inválido', { email: 'nao-e-email' }],
    ['sem aceite dos termos', { aceiteTermos: false }],
    ['nome do condomínio curto', { nomeCondominio: 'ab' }],
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
