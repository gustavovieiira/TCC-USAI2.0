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
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    lancamento: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  prisma.$transaction = jest.fn((callback: (tx: unknown) => unknown) => callback(prisma));

  return prisma;
}

function buildAsaasMock(): jest.Mocked<AsaasClient> {
  return {
    criarCliente: jest.fn(),
    criarCobrancaPix: jest.fn(),
    buscarCobranca: jest.fn(),
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
      valor: 100,
    });
    prisma.locacao.updateMany.mockResolvedValue({ count: 1 });
    prisma.locacao.findUniqueOrThrow.mockResolvedValue({
      id: LOCACAO_ID,
      itemId: ITEM_ID,
      locatarioId: LOCATARIO_ID,
      dataInicio: new Date('2026-10-01'),
      dataFim: new Date('2026-10-03'),
      item: { id: ITEM_ID, titulo: 'Furadeira Bosch', ownerId: OWNER_ID, condominioId: 'cond-1' },
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
      data: { status: 'PAGA', taxaPlataforma: 10, valorLiquido: 90 },
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
      valor: 100,
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

describe('PagamentosService.conferirPendentes', () => {
  it('confirma só as cobranças que o Asaas já marcou como recebidas', async () => {
    const prisma = buildPrismaMock();
    const asaas = buildAsaasMock();
    prisma.pagamento.findMany.mockResolvedValue([
      { id: 'pg-1', asaasChargeId: 'pay_paga' },
      { id: 'pg-2', asaasChargeId: 'pay_pendente' },
    ]);
    asaas.buscarCobranca
      .mockResolvedValueOnce({ id: 'pay_paga', status: 'RECEIVED' })
      .mockResolvedValueOnce({ id: 'pay_pendente', status: 'PENDING' });

    const service = new PagamentosService(prisma, asaas);
    const confirmar = jest.spyOn(service, 'confirmarPagamento').mockResolvedValue(undefined);

    const confirmados = await service.conferirPendentes();

    expect(confirmados).toBe(1);
    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(confirmar).toHaveBeenCalledWith('pay_paga');
  });

  it('só busca pagamentos pendentes com cobrança criada, dentro da janela de conferência', async () => {
    const prisma = buildPrismaMock();
    const asaas = buildAsaasMock();

    const service = new PagamentosService(prisma, asaas);
    await service.conferirPendentes();

    expect(prisma.pagamento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PENDENTE',
          asaasChargeId: { not: null },
          createdAt: { gte: expect.any(Date) },
        }),
      }),
    );
  });

  it('uma cobrança que falha na consulta não impede a conferência das demais', async () => {
    const prisma = buildPrismaMock();
    const asaas = buildAsaasMock();
    prisma.pagamento.findMany.mockResolvedValue([
      { id: 'pg-1', asaasChargeId: 'pay_quebrada' },
      { id: 'pg-2', asaasChargeId: 'pay_paga' },
    ]);
    asaas.buscarCobranca
      .mockRejectedValueOnce(new Error('Asaas fora do ar'))
      .mockResolvedValueOnce({ id: 'pay_paga', status: 'RECEIVED' });

    const service = new PagamentosService(prisma, asaas);
    const confirmar = jest.spyOn(service, 'confirmarPagamento').mockResolvedValue(undefined);

    const confirmados = await service.conferirPendentes();

    expect(confirmados).toBe(1);
    expect(confirmar).toHaveBeenCalledWith('pay_paga');
  });

  it('não faz nenhuma consulta ao Asaas quando não há pagamentos pendentes', async () => {
    const prisma = buildPrismaMock();
    const asaas = buildAsaasMock();

    const service = new PagamentosService(prisma, asaas);
    const confirmados = await service.conferirPendentes();

    expect(confirmados).toBe(0);
    expect(asaas.buscarCobranca).not.toHaveBeenCalled();
  });
});

describe('PagamentosService.confirmarPagamento — notificações', () => {
  function comNotificacoes() {
    const notificacoes = {
      notificar: jest.fn().mockResolvedValue(undefined),
      notificarAdmins: jest.fn().mockResolvedValue(undefined),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return notificacoes as any;
  }

  function prepararConfirmacao(prisma: ReturnType<typeof buildPrismaMock>) {
    prisma.pagamento.updateMany.mockResolvedValue({ count: 1 });
    prisma.pagamento.findUnique.mockResolvedValue({
      id: 'pagamento-1',
      locacaoId: LOCACAO_ID,
      asaasChargeId: 'pay_123',
      valor: 100,
    });
    prisma.locacao.updateMany.mockResolvedValue({ count: 1 });
    prisma.locacao.findUniqueOrThrow.mockResolvedValue({
      id: LOCACAO_ID,
      itemId: ITEM_ID,
      locatarioId: LOCATARIO_ID,
      dataInicio: new Date('2026-10-01'),
      dataFim: new Date('2026-10-03'),
      item: { id: ITEM_ID, titulo: 'Furadeira Bosch', ownerId: OWNER_ID, condominioId: 'cond-1' },
      locatario: { nome: 'Bruno Locatario' },
    });
  }

  it('avisa o locatário, o dono (com o líquido e a taxa) e cada concorrente cancelado', async () => {
    const prisma = buildPrismaMock();
    prepararConfirmacao(prisma);
    prisma.locacao.findMany.mockResolvedValue([
      { id: 'locacao-concorrente', locatarioId: 'outro-locatario', pagamento: null },
    ]);
    const notificacoes = comNotificacoes();

    await new PagamentosService(prisma, buildAsaasMock(), notificacoes).confirmarPagamento(
      'pay_123',
    );

    expect(notificacoes.notificar).toHaveBeenCalledWith(
      expect.objectContaining({ userId: LOCATARIO_ID, tipo: 'PAGAMENTO_CONFIRMADO' }),
    );
    const recebido = notificacoes.notificar.mock.calls
      .map((c: unknown[]) => c[0])
      .find((n: { tipo: string }) => n.tipo === 'PAGAMENTO_RECEBIDO');
    expect(recebido.userId).toBe(OWNER_ID);
    expect(recebido.mensagem).toContain('Bruno Locatario pagou "Furadeira Bosch"');
    expect(recebido.mensagem).toContain('R$ 90,00');
    expect(recebido.mensagem).toContain('R$ 10,00');
    expect(notificacoes.notificar).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'outro-locatario', tipo: 'LOCACAO_CANCELADA' }),
    );
  });

  it('reentrega do webhook (já confirmado) não notifica de novo', async () => {
    const prisma = buildPrismaMock();
    prisma.pagamento.updateMany.mockResolvedValue({ count: 0 });
    const notificacoes = comNotificacoes();

    await new PagamentosService(prisma, buildAsaasMock(), notificacoes).confirmarPagamento(
      'pay_123',
    );

    expect(notificacoes.notificar).not.toHaveBeenCalled();
  });

  it('pagamento órfão avisa o locatário do reembolso e os admins do reembolso manual', async () => {
    const prisma = buildPrismaMock();
    prisma.pagamento.updateMany.mockResolvedValue({ count: 1 });
    prisma.pagamento.findUnique.mockResolvedValue({
      id: 'pagamento-1',
      locacaoId: LOCACAO_ID,
      asaasChargeId: 'pay_123',
      valor: 100,
    });
    prisma.locacao.updateMany.mockResolvedValue({ count: 0 });
    prisma.locacao.findUnique.mockResolvedValue({
      id: LOCACAO_ID,
      locatarioId: LOCATARIO_ID,
      item: { titulo: 'Furadeira Bosch', ownerId: OWNER_ID },
    });
    const notificacoes = comNotificacoes();

    await new PagamentosService(prisma, buildAsaasMock(), notificacoes).confirmarPagamento(
      'pay_123',
    );

    expect(notificacoes.notificar).toHaveBeenCalledWith(
      expect.objectContaining({ userId: LOCATARIO_ID, tipo: 'PAGAMENTO_REEMBOLSO' }),
    );
    expect(notificacoes.notificarAdmins).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'PAGAMENTO_REEMBOLSO', link: '/admin' }),
    );
    expect(notificacoes.notificar).not.toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'PAGAMENTO_RECEBIDO' }),
    );
  });
});

describe('PagamentosService.confirmarPagamento — livro-razão e comissão do síndico', () => {
  function prepararConfirmacao(prisma: ReturnType<typeof buildPrismaMock>) {
    prisma.pagamento.updateMany.mockResolvedValue({ count: 1 });
    prisma.pagamento.findUnique.mockResolvedValue({
      id: 'pagamento-1',
      locacaoId: LOCACAO_ID,
      asaasChargeId: 'pay_123',
      valor: 100,
    });
    prisma.locacao.updateMany.mockResolvedValue({ count: 1 });
    prisma.locacao.findUniqueOrThrow.mockResolvedValue({
      id: LOCACAO_ID,
      itemId: ITEM_ID,
      locatarioId: LOCATARIO_ID,
      dataInicio: new Date('2026-10-01'),
      dataFim: new Date('2026-10-03'),
      item: { id: ITEM_ID, titulo: 'Furadeira Bosch', ownerId: OWNER_ID, condominioId: 'cond-1' },
      locatario: { nome: 'Bruno Locatario' },
    });
  }

  it('grava no livro-razão: líquido pro dono, 10% pro síndico e o registro do que o locatário pagou — tudo na mesma transação', async () => {
    const prisma = buildPrismaMock();
    prepararConfirmacao(prisma);
    prisma.user.findMany.mockResolvedValue([{ id: 'sindico-1' }]);

    await new PagamentosService(prisma, buildAsaasMock()).confirmarPagamento('pay_123');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const dados = prisma.lancamento.createMany.mock.calls[0][0].data;
    expect(
      dados.map((l: { tipo: string; userId: string | null; valor: number }) => [
        l.tipo,
        l.userId,
        l.valor,
      ]),
    ).toEqual([
      ['ALUGUEL_RECEBIDO', OWNER_ID, 90],
      ['ALUGUEL_PAGO', LOCATARIO_ID, 100],
      ['COMISSAO_CONDOMINIO', 'sindico-1', 10],
    ]);
  });

  it('se gravar o livro-razão falhar, a transação inteira falha (a locação não vira PAGA sem o dinheiro registrado)', async () => {
    const prisma = buildPrismaMock();
    prepararConfirmacao(prisma);
    prisma.lancamento.createMany.mockRejectedValue(new Error('banco indisponível'));

    await expect(
      new PagamentosService(prisma, buildAsaasMock()).confirmarPagamento('pay_123'),
    ).rejects.toThrow('banco indisponível');
  });

  it('avisa cada síndico do valor da comissão, dizendo quando foi dividida', async () => {
    const prisma = buildPrismaMock();
    prepararConfirmacao(prisma);
    prisma.user.findMany.mockResolvedValue([{ id: 's-1' }, { id: 's-2' }]);
    const notificacoes = {
      notificar: jest.fn().mockResolvedValue(undefined),
      notificarAdmins: jest.fn().mockResolvedValue(undefined),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await new PagamentosService(prisma, buildAsaasMock(), notificacoes as any).confirmarPagamento(
      'pay_123',
    );

    const avisos = notificacoes.notificar.mock.calls
      .map(
        (c: unknown[]) => c[0] as { userId: string; tipo: string; mensagem: string; link: string },
      )
      .filter((n) => n.tipo === 'COMISSAO_RECEBIDA');
    expect(avisos.map((n) => n.userId)).toEqual(['s-1', 's-2']);
    expect(avisos[0].mensagem).toContain('R$ 5,00');
    expect(avisos[0].mensagem).toContain('dividida entre 2 síndicos');
    expect(avisos[0].link).toBe('/saques');
  });

  it('sem síndico ativo ninguém recebe aviso de comissão (a taxa fica com a USAI)', async () => {
    const prisma = buildPrismaMock();
    prepararConfirmacao(prisma);
    const notificacoes = {
      notificar: jest.fn().mockResolvedValue(undefined),
      notificarAdmins: jest.fn().mockResolvedValue(undefined),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await new PagamentosService(prisma, buildAsaasMock(), notificacoes as any).confirmarPagamento(
      'pay_123',
    );

    expect(notificacoes.notificar).not.toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'COMISSAO_RECEBIDA' }),
    );
    expect(prisma.lancamento.createMany.mock.calls[0][0].data).toContainEqual(
      expect.objectContaining({ tipo: 'TAXA_PLATAFORMA', userId: null, valor: 10 }),
    );
  });

  it('pagamento órfão e reentrega do webhook não gravam nada no livro-razão', async () => {
    const prisma = buildPrismaMock();
    prisma.pagamento.updateMany.mockResolvedValue({ count: 0 });
    await new PagamentosService(prisma, buildAsaasMock()).confirmarPagamento('pay_123');

    const orfao = buildPrismaMock();
    orfao.pagamento.updateMany.mockResolvedValue({ count: 1 });
    orfao.pagamento.findUnique.mockResolvedValue({
      id: 'p',
      locacaoId: LOCACAO_ID,
      asaasChargeId: 'pay_123',
      valor: 100,
    });
    orfao.locacao.updateMany.mockResolvedValue({ count: 0 });
    await new PagamentosService(orfao, buildAsaasMock()).confirmarPagamento('pay_123');

    expect(prisma.lancamento.createMany).not.toHaveBeenCalled();
    expect(orfao.lancamento.createMany).not.toHaveBeenCalled();
  });
});
