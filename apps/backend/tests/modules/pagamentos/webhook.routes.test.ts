import request from 'supertest';

jest.mock('@/modules/pagamentos/asaas.client');

jest.mock('@/common/prisma', () => {
  const mockPrisma = {
    locacao: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    pagamento: {
      upsert: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: { update: jest.fn() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  mockPrisma.$transaction = jest.fn((callback: (tx: unknown) => unknown) => callback(mockPrisma));

  return { prisma: mockPrisma };
});

import { createApp } from '@/app';
import { prisma } from '@/common/prisma';

const WEBHOOK_TOKEN = 'test-webhook-token';

beforeAll(() => {
  process.env.ASAAS_WEBHOOK_TOKEN = WEBHOOK_TOKEN;
});

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.locacao.findMany as jest.Mock).mockResolvedValue([]);
});

describe('POST /api/webhooks/asaas', () => {
  it('rejeita sem o token do header com 401', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/webhooks/asaas')
      .send({ event: 'PAYMENT_RECEIVED', payment: { id: 'pay_123' } });

    expect(response.status).toBe(401);
  });

  it('rejeita com token errado com 401', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/webhooks/asaas')
      .set('asaas-access-token', 'token-errado')
      .send({ event: 'PAYMENT_RECEIVED', payment: { id: 'pay_123' } });

    expect(response.status).toBe(401);
  });

  it('confirma o pagamento e responde 200 quando o evento é PAYMENT_RECEIVED', async () => {
    (prisma.pagamento.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.pagamento.findUnique as jest.Mock).mockResolvedValue({
      id: 'pagamento-1',
      locacaoId: 'locacao-1',
      asaasChargeId: 'pay_123',
    });
    (prisma.locacao.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.locacao.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      id: 'locacao-1',
      itemId: 'item-1',
      locatarioId: 'locatario-1',
      dataInicio: new Date('2026-10-01'),
      dataFim: new Date('2026-10-03'),
      item: { id: 'item-1', ownerId: 'owner-1' },
    });
    const app = createApp();

    const response = await request(app)
      .post('/api/webhooks/asaas')
      .set('asaas-access-token', WEBHOOK_TOKEN)
      .send({ event: 'PAYMENT_RECEIVED', payment: { id: 'pay_123' } });

    expect(response.status).toBe(200);
    expect(prisma.locacao.updateMany).toHaveBeenCalledWith({
      where: { id: 'locacao-1', status: 'APROVADA' },
      data: { status: 'PAGA' },
    });
  });

  it('responde 200 e não faz nada pra eventos que não são de pagamento confirmado', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/webhooks/asaas')
      .set('asaas-access-token', WEBHOOK_TOKEN)
      .send({ event: 'PAYMENT_CREATED', payment: { id: 'pay_123' } });

    expect(response.status).toBe(200);
    expect(prisma.pagamento.updateMany).not.toHaveBeenCalled();
  });

  it('responde 200 mesmo com corpo malformado (nunca deixa o Asaas reentregar por erro nosso)', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/webhooks/asaas')
      .set('asaas-access-token', WEBHOOK_TOKEN)
      .send({ nada: 'a ver' });

    expect(response.status).toBe(200);
  });
});
