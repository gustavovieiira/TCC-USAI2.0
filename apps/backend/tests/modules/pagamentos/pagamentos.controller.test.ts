import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('@/modules/pagamentos/asaas.client');

jest.mock('@/common/prisma', () => ({
  prisma: {
    locacao: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    pagamento: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: { update: jest.fn() },
  },
}));

import { createApp } from '@/app';
import { prisma } from '@/common/prisma';
import { AsaasClient } from '@/modules/pagamentos/asaas.client';

const ACCESS_SECRET = 'test-access-secret';
const LOCATARIO_ID = 'locatario-1';
const LOCACAO_ID = 'locacao-1';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
});

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.locacao.findMany as jest.Mock).mockResolvedValue([]);
});

function token(userId: string): string {
  return jwt.sign({ userId, papel: 'MORADOR', condominioId: 'cond-1' }, ACCESS_SECRET, {
    expiresIn: '1h',
  });
}

const locacaoAprovada = {
  id: LOCACAO_ID,
  itemId: 'item-1',
  locatarioId: LOCATARIO_ID,
  valorTotal: 150,
  status: 'APROVADA',
  item: { id: 'item-1', titulo: 'Furadeira Bosch', ownerId: 'owner-1' },
  locatario: {
    id: LOCATARIO_ID,
    nome: 'Bruno Locatario',
    email: 'bruno@example.com',
    cpf: '12345678901',
    asaasCustomerId: 'cus_123',
  },
  pagamento: null,
};

describe('POST /api/locacoes/:id/pagamento', () => {
  it('cria a cobrança PIX e retorna o invoiceUrl', async () => {
    (prisma.locacao.findUnique as jest.Mock).mockResolvedValue(locacaoAprovada);
    (AsaasClient.prototype.criarCobrancaPix as jest.Mock).mockResolvedValue({
      id: 'pay_123',
      invoiceUrl: 'https://sandbox.asaas.com/i/pay_123',
      status: 'PENDING',
    });
    const app = createApp();

    const response = await request(app)
      .post(`/api/locacoes/${LOCACAO_ID}/pagamento`)
      .set('Authorization', `Bearer ${token(LOCATARIO_ID)}`);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ invoiceUrl: 'https://sandbox.asaas.com/i/pay_123' });
  });

  it('rejeita sem autenticação com 401', async () => {
    const app = createApp();

    const response = await request(app).post(`/api/locacoes/${LOCACAO_ID}/pagamento`);

    expect(response.status).toBe(401);
  });

  it('rejeita quem não é o locatário com 403', async () => {
    (prisma.locacao.findUnique as jest.Mock).mockResolvedValue(locacaoAprovada);
    const app = createApp();

    const response = await request(app)
      .post(`/api/locacoes/${LOCACAO_ID}/pagamento`)
      .set('Authorization', `Bearer ${token('outro-usuario')}`);

    expect(response.status).toBe(403);
  });

  it('rejeita locação que não está aprovada com 409', async () => {
    (prisma.locacao.findUnique as jest.Mock).mockResolvedValue({
      ...locacaoAprovada,
      status: 'PENDENTE',
    });
    const app = createApp();

    const response = await request(app)
      .post(`/api/locacoes/${LOCACAO_ID}/pagamento`)
      .set('Authorization', `Bearer ${token(LOCATARIO_ID)}`);

    expect(response.status).toBe(409);
  });
});
