import { SaquesService } from '@/modules/saques/saques.service';
import { AppError, NotFoundError } from '@/common/errors';

function buildPrismaMock() {
  const prisma = {
    solicitacaoSaque: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _sum: { valor: null } }),
    },
    locacao: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { valorLiquido: null } }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    logAuditoria: { create: jest.fn() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  // Nos testes, a transação roda contra o mesmo mock — equivalente o bastante ao Prisma real pra
  // verificar a lógica de saldo sem precisar simular um client de transação à parte.
  prisma.$transaction = jest.fn((callback: (tx: unknown) => unknown) => callback(prisma));

  return prisma;
}

/** Ajuda os testes de `solicitar` a simular quanto a pessoa já recebeu em locações pagas. */
function comSaldoRecebido(prisma: ReturnType<typeof buildPrismaMock>, valorLiquido: number) {
  prisma.locacao.aggregate.mockResolvedValue({ _sum: { valorLiquido } });
}

const USER_ID = 'user-1';
const ADMIN_ID = 'admin-1';
const SAQUE_ID = 'saque-1';

const saquePendente = {
  id: SAQUE_ID,
  userId: USER_ID,
  valor: 100 as unknown as number,
  chavePixUsada: 'user@pix.com',
  status: 'PENDENTE',
  motivoRejeicao: null,
  createdAt: new Date('2026-09-15'),
  processadoEm: null,
  user: { nome: 'Bruno Locatario' },
};

describe('SaquesService.calcularSaldo', () => {
  it('é a soma das locações pagas (já com a taxa da plataforma descontada) menos o que já foi sacado e o que está pendente', async () => {
    const prisma = buildPrismaMock();
    comSaldoRecebido(prisma, 450);
    prisma.solicitacaoSaque.aggregate
      .mockResolvedValueOnce({ _sum: { valor: 120 } }) // APROVADO
      .mockResolvedValueOnce({ _sum: { valor: 80 } }); // PENDENTE

    const service = new SaquesService(prisma);
    const saldo = await service.calcularSaldo(USER_ID);

    // Líquido já gravado nas locações: 450; 450 - 120 (sacado) - 80 (em análise) = 250.
    expect(saldo).toBe(250);
  });

  it('é o líquido gravado nas locações pagas (a taxa já saiu na confirmação) quando não há saque em aberto', async () => {
    const prisma = buildPrismaMock();
    comSaldoRecebido(prisma, 90);

    const service = new SaquesService(prisma);
    const saldo = await service.calcularSaldo(USER_ID);

    expect(saldo).toBe(90);
  });

  it('nunca fica negativo mesmo se sacado+pendente superar o recebido', async () => {
    const prisma = buildPrismaMock();
    comSaldoRecebido(prisma, 100);
    prisma.solicitacaoSaque.aggregate
      .mockResolvedValueOnce({ _sum: { valor: 90 } })
      .mockResolvedValueOnce({ _sum: { valor: 50 } });

    const service = new SaquesService(prisma);
    const saldo = await service.calcularSaldo(USER_ID);

    expect(saldo).toBe(0);
  });

  it('é zero quando a pessoa nunca recebeu nenhuma locação paga', async () => {
    const prisma = buildPrismaMock();

    const service = new SaquesService(prisma);
    const saldo = await service.calcularSaldo(USER_ID);

    expect(saldo).toBe(0);
  });
});

describe('SaquesService.solicitar', () => {
  it('morador solicita saque dentro do saldo disponível', async () => {
    const prisma = buildPrismaMock();
    comSaldoRecebido(prisma, 500);
    prisma.solicitacaoSaque.create.mockResolvedValue(saquePendente);

    const service = new SaquesService(prisma);
    const result = await service.solicitar(USER_ID, { valor: 100, chavePixUsada: 'user@pix.com' });

    expect(prisma.solicitacaoSaque.create).toHaveBeenCalledWith({
      data: { userId: USER_ID, valor: 100, chavePixUsada: 'user@pix.com', status: 'PENDENTE' },
    });
    expect(result.status).toBe('PENDENTE');
    expect(result.valor).toBe(100);
  });

  it('rejeita quando o valor pedido é maior que o saldo disponível', async () => {
    const prisma = buildPrismaMock();
    comSaldoRecebido(prisma, 50);

    const service = new SaquesService(prisma);

    await expect(
      service.solicitar(USER_ID, { valor: 100, chavePixUsada: 'user@pix.com' }),
    ).rejects.toBeInstanceOf(AppError);
    expect(prisma.solicitacaoSaque.create).not.toHaveBeenCalled();
  });

  it('rejeita quando a pessoa nunca recebeu nenhuma locação paga (saldo zero)', async () => {
    const prisma = buildPrismaMock();

    const service = new SaquesService(prisma);

    await expect(
      service.solicitar(USER_ID, { valor: 1, chavePixUsada: 'user@pix.com' }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe('SaquesService.aprovar', () => {
  it('admin aprova solicitação pendente e registra auditoria', async () => {
    const prisma = buildPrismaMock();
    prisma.solicitacaoSaque.findUnique.mockResolvedValue(saquePendente);
    prisma.solicitacaoSaque.update.mockResolvedValue({
      ...saquePendente,
      status: 'APROVADO',
      processadoEm: new Date('2026-09-15'),
    });

    const service = new SaquesService(prisma);
    const result = await service.aprovar(SAQUE_ID, ADMIN_ID);

    expect(result.status).toBe('APROVADO');
    expect(prisma.logAuditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminId: ADMIN_ID,
          acao: 'APROVAR_SAQUE',
          alvoTipo: 'SolicitacaoSaque',
          alvoId: SAQUE_ID,
        }),
      }),
    );
  });

  it('rejeita aprovar solicitação inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.solicitacaoSaque.findUnique.mockResolvedValue(null);

    const service = new SaquesService(prisma);

    await expect(service.aprovar('inexistente', ADMIN_ID)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejeita aprovar solicitação que não está mais pendente', async () => {
    const prisma = buildPrismaMock();
    prisma.solicitacaoSaque.findUnique.mockResolvedValue({ ...saquePendente, status: 'APROVADO' });

    const service = new SaquesService(prisma);

    await expect(service.aprovar(SAQUE_ID, ADMIN_ID)).rejects.toBeInstanceOf(AppError);
  });
});

describe('SaquesService.rejeitar', () => {
  it('admin rejeita solicitação pendente com motivo e registra auditoria', async () => {
    const prisma = buildPrismaMock();
    prisma.solicitacaoSaque.findUnique.mockResolvedValue(saquePendente);
    prisma.solicitacaoSaque.update.mockResolvedValue({
      ...saquePendente,
      status: 'REJEITADO',
      motivoRejeicao: 'Chave PIX divergente do cadastro',
      processadoEm: new Date('2026-09-15'),
    });

    const service = new SaquesService(prisma);
    const result = await service.rejeitar(SAQUE_ID, ADMIN_ID, {
      motivoRejeicao: 'Chave PIX divergente do cadastro',
    });

    expect(result.status).toBe('REJEITADO');
    expect(result.motivoRejeicao).toBe('Chave PIX divergente do cadastro');
    expect(prisma.logAuditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ adminId: ADMIN_ID, acao: 'REJEITAR_SAQUE' }),
      }),
    );
  });

  it('rejeita avaliar solicitação que já foi processada', async () => {
    const prisma = buildPrismaMock();
    prisma.solicitacaoSaque.findUnique.mockResolvedValue({ ...saquePendente, status: 'REJEITADO' });

    const service = new SaquesService(prisma);

    await expect(
      service.rejeitar(SAQUE_ID, ADMIN_ID, { motivoRejeicao: 'Motivo qualquer' }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe('SaquesService.listarTodas', () => {
  it('filtra por status quando informado e traz o nome de quem solicitou', async () => {
    const prisma = buildPrismaMock();
    prisma.solicitacaoSaque.findMany.mockResolvedValue([saquePendente]);

    const service = new SaquesService(prisma);
    const [resultado] = await service.listarTodas({ status: 'PENDENTE' });

    expect(prisma.solicitacaoSaque.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PENDENTE' }, include: { user: true } }),
    );
    expect(resultado.solicitanteNome).toBe('Bruno Locatario');
  });
});

describe('SaquesService.extrato', () => {
  const recebida = {
    id: 'loc-1',
    valorTotal: 100,
    valorLiquido: 90,
    taxaPlataforma: 10,
    updatedAt: new Date('2026-10-02'),
    item: { titulo: 'Furadeira' },
    locatario: { id: 'loc-user', nome: 'Carla Locataria', email: 'carla@x.com' },
    pagamento: { pagoEm: new Date('2026-10-03') },
  };

  it('lista o que entrou (já com a taxa), o que saiu e o resumo batendo com o saldo', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findMany
      .mockResolvedValueOnce([recebida]) // recebidas
      .mockResolvedValueOnce([]); // pagas como locatário
    prisma.solicitacaoSaque.findMany.mockResolvedValue([
      { ...saquePendente, valor: 30, createdAt: new Date('2026-10-05') },
      {
        ...saquePendente,
        id: 'saque-2',
        valor: 20,
        status: 'APROVADO',
        chavePixUsada: 'chave-pix-longa-1234',
        createdAt: new Date('2026-10-04'),
        processadoEm: new Date('2026-10-04'),
      },
    ]);
    comSaldoRecebido(prisma, 90);
    prisma.solicitacaoSaque.aggregate
      .mockResolvedValueOnce({ _sum: { valor: 20 } })
      .mockResolvedValueOnce({ _sum: { valor: 30 } });

    const extrato = await new SaquesService(prisma).extrato(USER_ID);

    expect(extrato.resumo).toEqual({
      saldoDisponivel: 40,
      totalRecebido: 90,
      totalSacado: 20,
      emAnalise: 30,
    });
    // Mais recente primeiro: saque pendente (05), saque pago (04), recebimento (03).
    expect(extrato.movimentos.map((m) => m.id)).toEqual(['saque-1', 'saque-2', 'loc-1']);
    expect(extrato.movimentos[0]).toMatchObject({ valor: -30, status: 'EM_ANALISE' });
    expect(extrato.movimentos[1]).toMatchObject({
      valor: -20,
      status: 'PAGO',
      chavePix: '****1234',
    });
    expect(extrato.movimentos[2]).toMatchObject({
      tipo: 'RECEBIMENTO',
      valor: 90,
      valorBruto: 100,
      taxa: 10,
      contraparte: { id: 'loc-user', nome: 'Carla Locataria' },
    });
  });

  it('nunca expõe e-mail da contraparte nem a chave PIX inteira', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findMany.mockResolvedValueOnce([recebida]).mockResolvedValueOnce([]);
    prisma.solicitacaoSaque.findMany.mockResolvedValue([saquePendente]);

    const extrato = await new SaquesService(prisma).extrato(USER_ID);
    const json = JSON.stringify(extrato);

    expect(json).not.toContain('carla@x.com');
    expect(json).not.toContain('user@pix.com');
    // Chave e-mail: primeira letra + domínio, nada do meio.
    expect(extrato.movimentos.find((m) => m.tipo === 'SAQUE')?.chavePix).toBe('u***@pix.com');
  });

  it('mostra o que a pessoa pagou como locatário, marcando reembolso pendente quando PAGO_ORFAO', async () => {
    const prisma = buildPrismaMock();
    const paga = (id: string, status: string, pagoEm: string) => ({
      id,
      valorTotal: 50,
      updatedAt: new Date(pagoEm),
      item: { titulo: 'Escada', owner: { id: 'dono-1', nome: 'Davi Dono' } },
      pagamento: { status, valor: 50, pagoEm: new Date(pagoEm) },
    });
    prisma.locacao.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        paga('p-1', 'PAGO', '2026-10-01'),
        paga('p-2', 'PAGO_ORFAO', '2026-10-02'),
      ]);

    const extrato = await new SaquesService(prisma).extrato(USER_ID);

    expect(extrato.pagamentos.map((p) => [p.id, p.status])).toEqual([
      ['p-2', 'EM_REEMBOLSO'],
      ['p-1', 'CONFIRMADO'],
    ]);
    expect(extrato.pagamentos[0].contraparte).toEqual({ id: 'dono-1', nome: 'Davi Dono' });
    // Pagar como locatário não mexe no saldo nem no total recebido.
    expect(extrato.resumo.totalRecebido).toBe(0);
  });

  it('saque rejeitado aparece no extrato com o motivo mas não conta em sacado nem em análise', async () => {
    const prisma = buildPrismaMock();
    prisma.solicitacaoSaque.findMany.mockResolvedValue([
      { ...saquePendente, status: 'REJEITADO', motivoRejeicao: 'Chave PIX divergente' },
    ]);

    const extrato = await new SaquesService(prisma).extrato(USER_ID);

    expect(extrato.movimentos[0]).toMatchObject({
      status: 'REJEITADO',
      motivo: 'Chave PIX divergente',
    });
    expect(extrato.resumo).toMatchObject({ totalSacado: 0, emAnalise: 0 });
  });
});
