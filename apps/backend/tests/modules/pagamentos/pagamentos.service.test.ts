import { PagamentosService } from '@/modules/pagamentos/pagamentos.service';
import { AsaasClient } from '@/modules/pagamentos/asaas.client';
import { AppError, ForbiddenError, NotFoundError } from '@/common/errors';

jest.mock('@/realtime/emitter', () => ({ emitirParaUsuario: jest.fn() }));

function buildPrismaMock() {
  const prisma = {
    locacao: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    pagamento: {
      upsert: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  prisma.$transaction = jest.fn((callback: (tx: unknown) => unknown) => callback(prisma));

  return prisma;
}

function buildAsaasMock(): jest.Mocked<AsaasClient> {
  return {
    criarCliente: jest.fn(),
    criarCobrancaPix: jest.fn(),
    cancelarCobranca: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AsaasClient>;
}

const LOCATARIO_ID = 'locatario-1';
const OWNER_ID = 'owner-1';
const ITEM_ID = 'item-1';
const LOCACAO_ID = 'locacao-1';

const locatario = {
  id: LOCATARIO_ID,
  nome: 'Bruno Locatario',
  email: 'bruno@example.com',
  cpf: '12345678901',
  asaasCustomerId: null as string | null,
};

const item = { id: ITEM_ID, titulo: 'Furadeira Bosch', ownerId: OWNER_ID };

const locacaoAprovada = {
  id: LOCACAO_ID,
  itemId: ITEM_ID,
  locatarioId: LOCATARIO_ID,
  dataInicio: new Date('2026-10-01'),
  dataFim: new Date('2026-10-03'),
  valorTotal: 150 as unknown as number,
  status: 'APROVADA',
  item,
  locatario,
  pagamento: null as unknown,
};

describe('PagamentosService.criarCobranca', () => {
  it('cria cliente + cobrança no Asaas e persiste o Pagamento (fluxo feliz)', async () => {
    const prisma = buildPrismaMock();
    const asaas = buildAsaasMock();
    prisma.locacao.findUnique.mockResolvedValue(locacaoAprovada);
    asaas.criarCliente.mockResolvedValue({ id: 'cus_123' });
    asaas.criarCobrancaPix.mockResolvedValue({
      id: 'pay_123',
      invoiceUrl: 'https://sandbox.asaas.com/i/pay_123',
      status: 'PENDING',
    });

    const service = new PagamentosService(prisma, asaas);
    const result = await service.criarCobranca(LOCACAO_ID, LOCATARIO_ID);

    expect(asaas.criarCliente).toHaveBeenCalledWith({
      nome: 'Bruno Locatario',
      cpfCnpj: '12345678901',
      email: 'bruno@example.com',
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: LOCATARIO_ID },
      data: { asaasCustomerId: 'cus_123' },
    });
    expect(asaas.criarCobrancaPix).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'cus_123', valor: 150, externalReference: LOCACAO_ID }),
    );
    expect(prisma.pagamento.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { locacaoId: LOCACAO_ID },
        create: expect.objectContaining({ asaasChargeId: 'pay_123', status: 'PENDENTE' }),
      }),
    );
    expect(result).toEqual({ invoiceUrl: 'https://sandbox.asaas.com/i/pay_123' });
  });

  it('reaproveita o asaasCustomerId já salvo, sem criar cliente de novo', async () => {
    const prisma = buildPrismaMock();
    const asaas = buildAsaasMock();
    prisma.locacao.findUnique.mockResolvedValue({
      ...locacaoAprovada,
      locatario: { ...locatario, asaasCustomerId: 'cus_existente' },
    });
    asaas.criarCobrancaPix.mockResolvedValue({
      id: 'pay_123',
      invoiceUrl: 'https://sandbox.asaas.com/i/pay_123',
      status: 'PENDING',
    });

    const service = new PagamentosService(prisma, asaas);
    await service.criarCobranca(LOCACAO_ID, LOCATARIO_ID);

    expect(asaas.criarCliente).not.toHaveBeenCalled();
    expect(asaas.criarCobrancaPix).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'cus_existente' }),
    );
  });

  it('reaproveita invoiceUrl já existente, sem chamar o Asaas de novo (idempotente)', async () => {
    const prisma = buildPrismaMock();
    const asaas = buildAsaasMock();
    prisma.locacao.findUnique.mockResolvedValue({
      ...locacaoAprovada,
      pagamento: { invoiceUrl: 'https://sandbox.asaas.com/i/ja-existente' },
    });

    const service = new PagamentosService(prisma, asaas);
    const result = await service.criarCobranca(LOCACAO_ID, LOCATARIO_ID);

    expect(asaas.criarCliente).not.toHaveBeenCalled();
    expect(asaas.criarCobrancaPix).not.toHaveBeenCalled();
    expect(result).toEqual({ invoiceUrl: 'https://sandbox.asaas.com/i/ja-existente' });
  });

  it('rejeita quando a locação não existe', async () => {
    const prisma = buildPrismaMock();
    const asaas = buildAsaasMock();
    prisma.locacao.findUnique.mockResolvedValue(null);

    const service = new PagamentosService(prisma, asaas);

    await expect(service.criarCobranca('inexistente', LOCATARIO_ID)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('rejeita quando quem chama não é o locatário da locação', async () => {
    const prisma = buildPrismaMock();
    const asaas = buildAsaasMock();
    prisma.locacao.findUnique.mockResolvedValue(locacaoAprovada);

    const service = new PagamentosService(prisma, asaas);

    await expect(service.criarCobranca(LOCACAO_ID, 'outro-usuario')).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('rejeita quando a locação não está aprovada', async () => {
    const prisma = buildPrismaMock();
    const asaas = buildAsaasMock();
    prisma.locacao.findUnique.mockResolvedValue({ ...locacaoAprovada, status: 'PENDENTE' });

    const service = new PagamentosService(prisma, asaas);

    await expect(service.criarCobranca(LOCACAO_ID, LOCATARIO_ID)).rejects.toBeInstanceOf(AppError);
  });

  it('rejeita quando o locatário não tem CPF cadastrado', async () => {
    const prisma = buildPrismaMock();
    const asaas = buildAsaasMock();
    prisma.locacao.findUnique.mockResolvedValue({
      ...locacaoAprovada,
      locatario: { ...locatario, cpf: null },
    });

    const service = new PagamentosService(prisma, asaas);

    await expect(service.criarCobranca(LOCACAO_ID, LOCATARIO_ID)).rejects.toMatchObject({
      code: 'CPF_OBRIGATORIO',
    });
    expect(asaas.criarCliente).not.toHaveBeenCalled();
  });
});

describe('PagamentosService.confirmarPagamento', () => {
  it('confirma o pagamento, marca a locação PAGA e cancela concorrentes do mesmo item/período', async () => {
    const prisma = buildPrismaMock();
    const asaas = buildAsaasMock();
    prisma.pagamento.updateMany.mockResolvedValue({ count: 1 });
    prisma.pagamento.findUnique.mockResolvedValue({
      id: 'pagamento-1',
      locacaoId: LOCACAO_ID,
      asaasChargeId: 'pay_123',
    });
    prisma.locacao.updateMany.mockResolvedValue({ count: 1 });
    prisma.locacao.findUniqueOrThrow.mockResolvedValue({
      id: LOCACAO_ID,
      itemId: ITEM_ID,
      locatarioId: LOCATARIO_ID,
      dataInicio: new Date('2026-10-01'),
      dataFim: new Date('2026-10-03'),
      item: { id: ITEM_ID, ownerId: OWNER_ID },
    });
    const concorrente = {
      id: 'locacao-concorrente',
      locatarioId: 'outro-locatario',
      pagamento: { asaasChargeId: 'pay_concorrente' },
    };
    prisma.locacao.findMany.mockResolvedValue([concorrente]);

    const service = new PagamentosService(prisma, asaas);
    await service.confirmarPagamento('pay_123');

    expect(prisma.locacao.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: LOCACAO_ID, status: 'APROVADA' },
      data: { status: 'PAGA' },
    });
    expect(prisma.locacao.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: { in: ['locacao-concorrente'] } },
      data: { status: 'CANCELADA' },
    });
    expect(asaas.cancelarCobranca).toHaveBeenCalledWith('pay_concorrente');
  });

  it('não faz nada quando o asaasChargeId não corresponde a nenhum pagamento pendente (reentrega do webhook)', async () => {
    const prisma = buildPrismaMock();
    const asaas = buildAsaasMock();
    prisma.pagamento.updateMany.mockResolvedValue({ count: 0 });

    const service = new PagamentosService(prisma, asaas);
    await service.confirmarPagamento('pay_desconhecido');

    expect(prisma.locacao.updateMany).not.toHaveBeenCalled();
  });

  it('marca o pagamento como órfão quando a locação já não está mais APROVADA (perdeu a corrida)', async () => {
    const prisma = buildPrismaMock();
    const asaas = buildAsaasMock();
    prisma.pagamento.updateMany.mockResolvedValue({ count: 1 });
    prisma.pagamento.findUnique.mockResolvedValue({
      id: 'pagamento-1',
      locacaoId: LOCACAO_ID,
      asaasChargeId: 'pay_123',
    });
    prisma.locacao.updateMany.mockResolvedValue({ count: 0 });

    const service = new PagamentosService(prisma, asaas);
    await service.confirmarPagamento('pay_123');

    expect(prisma.pagamento.update).toHaveBeenCalledWith({
      where: { id: 'pagamento-1' },
      data: { status: 'PAGO_ORFAO' },
    });
  });
});
