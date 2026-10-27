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
    lancamento: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { valor: null } }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    locacao: { findMany: jest.fn().mockResolvedValue([]) },
    logAuditoria: { create: jest.fn() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  // Nos testes, a transação roda contra o mesmo mock — equivalente o bastante ao Prisma real pra
  // verificar a lógica de saldo sem precisar simular um client de transação à parte.
  prisma.$transaction = jest.fn((callback: (tx: unknown) => unknown) => callback(prisma));

  return prisma;
}

/** Ajuda os testes a simular quanto a pessoa já recebeu (soma dos lançamentos que mexem no saldo). */
function comSaldoRecebido(prisma: ReturnType<typeof buildPrismaMock>, valor: number) {
  prisma.lancamento.aggregate.mockResolvedValue({ _sum: { valor } });
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
      include: { user: true },
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
      expect.objectContaining({
        where: { status: 'PENDENTE' },
        include: { user: { include: { condominio: true } } },
      }),
    );
    expect(resultado.solicitanteNome).toBe('Bruno Locatario');
  });
});

describe('SaquesService.extrato', () => {
  const locacaoOrigem = {
    id: 'loc-1',
    taxaPlataforma: 10,
    valorLiquido: 90,
    dataInicio: new Date('2026-10-05'),
    dataFim: new Date('2026-10-07'),
    item: { titulo: 'Furadeira', owner: { id: 'dono-1', nome: 'Davi Dono', email: 'davi@x.com' } },
    locatario: { id: 'loc-user', nome: 'Carla Locataria', email: 'carla@x.com' },
  };

  const recebimento = {
    id: 'lanc-1',
    tipo: 'ALUGUEL_RECEBIDO',
    valor: 90,
    afetaSaldo: true,
    baseCalculo: 100,
    taxaPercentual: 10,
    divididoEntre: null,
    descricao: 'Aluguel de "Furadeira"',
    createdAt: new Date('2026-10-03'),
    locacao: locacaoOrigem,
  };

  const comissao = {
    ...recebimento,
    id: 'lanc-2',
    tipo: 'COMISSAO_CONDOMINIO',
    valor: 5,
    divididoEntre: 2,
    descricao: 'Comissão do condomínio sobre o aluguel de "Furadeira"',
    createdAt: new Date('2026-10-03T00:00:01Z'),
  };

  it('lista o que entrou (já com a taxa), o que saiu e o resumo batendo com o saldo', async () => {
    const prisma = buildPrismaMock();
    prisma.lancamento.findMany
      .mockResolvedValueOnce([recebimento]) // créditos
      .mockResolvedValueOnce([]); // pagos como locatário
    prisma.solicitacaoSaque.findMany.mockResolvedValue([
      { ...saquePendente, valor: 30, createdAt: new Date('2026-10-05') },
      {
        ...saquePendente,
        id: 'saque-2',
        valor: 20,
        status: 'PAGO',
        chavePixUsada: 'chave-pix-longa-1234',
        createdAt: new Date('2026-10-04'),
        processadoEm: new Date('2026-10-04'),
        pagoEm: new Date('2026-10-04'),
      },
      {
        ...saquePendente,
        id: 'saque-3',
        valor: 10,
        status: 'APROVADO',
        createdAt: new Date('2026-10-03T12:00:00Z'),
        processadoEm: new Date('2026-10-03T12:00:00Z'),
      },
    ]);
    comSaldoRecebido(prisma, 90);
    prisma.solicitacaoSaque.aggregate
      .mockResolvedValueOnce({ _sum: { valor: 30 } }) // APROVADO + PAGO
      .mockResolvedValueOnce({ _sum: { valor: 30 } }); // PENDENTE

    const extrato = await new SaquesService(prisma).extrato(USER_ID);

    expect(extrato.resumo).toEqual({
      saldoDisponivel: 30,
      totalRecebido: 90,
      totalComissoes: 0,
      totalSacado: 20,
      aPagar: 10,
      emAnalise: 30,
    });
    // Mais recente primeiro: pendente (05), pago (04), aprovado (03 às 12h), recebimento (03 às 0h).
    expect(extrato.movimentos.map((m) => m.id)).toEqual([
      'saque-1',
      'saque-2',
      'saque-3',
      'lanc-1',
    ]);
    expect(extrato.movimentos[2]).toMatchObject({ valor: -10, status: 'APROVADO' });
    expect(extrato.movimentos[0]).toMatchObject({ valor: -30, status: 'EM_ANALISE' });
    expect(extrato.movimentos[1]).toMatchObject({
      valor: -20,
      status: 'PAGO',
      chavePix: '****1234',
    });
    expect(extrato.movimentos[3]).toMatchObject({
      tipo: 'RECEBIMENTO',
      valor: 90,
      valorBruto: 100,
      taxa: 10,
      taxaPercentual: 10,
      contraparte: { id: 'loc-user', nome: 'Carla Locataria' },
      periodo: { inicio: new Date('2026-10-05'), fim: new Date('2026-10-07') },
    });
  });

  it('cada entrada traz a origem: a locação, o item, o dono e quem pagou', async () => {
    const prisma = buildPrismaMock();
    prisma.lancamento.findMany.mockResolvedValueOnce([recebimento]).mockResolvedValueOnce([]);

    const extrato = await new SaquesService(prisma).extrato(USER_ID);

    expect(extrato.movimentos[0].origem).toEqual({
      locacaoId: 'loc-1',
      itemTitulo: 'Furadeira',
      dono: { id: 'dono-1', nome: 'Davi Dono' },
      locatario: { id: 'loc-user', nome: 'Carla Locataria' },
    });
  });

  it('comissão do condomínio aparece como COMISSAO, com a base, a taxa, a divisão entre síndicos e o total no resumo', async () => {
    const prisma = buildPrismaMock();
    prisma.lancamento.findMany.mockResolvedValueOnce([comissao]).mockResolvedValueOnce([]);
    comSaldoRecebido(prisma, 5);

    const extrato = await new SaquesService(prisma).extrato(USER_ID);

    expect(extrato.movimentos[0]).toMatchObject({
      tipo: 'COMISSAO',
      valor: 5,
      valorBruto: 100,
      taxa: 10,
      taxaPercentual: 10,
      divididoEntre: 2,
      contraparte: null,
    });
    expect(extrato.resumo).toMatchObject({ totalComissoes: 5, totalRecebido: 0 });
  });

  it('nunca expõe e-mail da contraparte nem a chave PIX inteira', async () => {
    const prisma = buildPrismaMock();
    prisma.lancamento.findMany.mockResolvedValueOnce([recebimento]).mockResolvedValueOnce([]);
    prisma.solicitacaoSaque.findMany.mockResolvedValue([saquePendente]);

    const extrato = await new SaquesService(prisma).extrato(USER_ID);
    const json = JSON.stringify(extrato);

    expect(json).not.toContain('carla@x.com');
    expect(json).not.toContain('davi@x.com');
    expect(json).not.toContain('user@pix.com');
    // Chave e-mail: primeira letra + domínio, nada do meio.
    expect(extrato.movimentos.find((m) => m.tipo === 'SAQUE')?.chavePix).toBe('u***@pix.com');
  });

  it('na visão do Admin a chave PIX sai inteira (ele precisa dela pra transferir)', async () => {
    const prisma = buildPrismaMock();
    prisma.solicitacaoSaque.findMany.mockResolvedValue([saquePendente]);

    const extrato = await new SaquesService(prisma).extrato(USER_ID, { revelarChavePix: true });

    expect(extrato.movimentos.find((m) => m.tipo === 'SAQUE')?.chavePix).toBe('user@pix.com');
  });

  it('o extrato é sempre do usuário pedido (filtra os lançamentos pelo userId)', async () => {
    const prisma = buildPrismaMock();

    await new SaquesService(prisma).extrato(USER_ID);

    expect(prisma.lancamento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID, afetaSaldo: true } }),
    );
    expect(prisma.lancamento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID, tipo: 'ALUGUEL_PAGO' } }),
    );
  });

  it('mostra o que a pessoa pagou como locatário, com a quebra taxa/repasse, e o pagamento órfão como "em reembolso"', async () => {
    const prisma = buildPrismaMock();
    const pago = {
      id: 'lanc-pago',
      tipo: 'ALUGUEL_PAGO',
      valor: 50,
      afetaSaldo: false,
      baseCalculo: 50,
      taxaPercentual: 10,
      descricao: 'Aluguel de "Escada"',
      createdAt: new Date('2026-10-01'),
      locacao: {
        ...locacaoOrigem,
        taxaPlataforma: 5,
        valorLiquido: 45,
        item: { titulo: 'Escada', owner: { id: 'dono-1', nome: 'Davi Dono' } },
      },
    };
    prisma.lancamento.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([pago]);
    prisma.locacao.findMany.mockResolvedValue([
      {
        id: 'p-orfao',
        valorTotal: 50,
        updatedAt: new Date('2026-10-02'),
        dataInicio: new Date('2026-10-10'),
        dataFim: new Date('2026-10-11'),
        item: { titulo: 'Escada', owner: { id: 'dono-1', nome: 'Davi Dono' } },
        pagamento: { status: 'PAGO_ORFAO', valor: 50, pagoEm: new Date('2026-10-02') },
      },
    ]);

    const extrato = await new SaquesService(prisma).extrato(USER_ID);

    expect(extrato.pagamentos.map((p) => [p.id, p.status])).toEqual([
      ['p-orfao', 'EM_REEMBOLSO'],
      ['lanc-pago', 'CONFIRMADO'],
    ]);
    expect(extrato.pagamentos[1]).toMatchObject({ valor: 50, taxa: 5, repasseDono: 45 });
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

describe('SaquesService — notificações', () => {
  function comNotificacoes() {
    const notificacoes = {
      notificar: jest.fn().mockResolvedValue(undefined),
      notificarAdmins: jest.fn().mockResolvedValue(undefined),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return notificacoes as any;
  }

  it('solicitar avisa os admins com o nome de quem pediu e o valor', async () => {
    const prisma = buildPrismaMock();
    comSaldoRecebido(prisma, 500);
    prisma.solicitacaoSaque.create.mockResolvedValue(saquePendente);
    const notificacoes = comNotificacoes();

    await new SaquesService(prisma, notificacoes).solicitar(USER_ID, {
      valor: 100,
      chavePixUsada: 'user@pix.com',
    });

    expect(notificacoes.notificarAdmins).toHaveBeenCalledWith({
      tipo: 'SAQUE_SOLICITADO',
      titulo: 'Novo pedido de saque',
      mensagem: 'Bruno Locatario pediu um saque de R$ 100,00.',
      link: '/admin',
    });
  });

  it('solicitar com saldo insuficiente não avisa ninguém', async () => {
    const prisma = buildPrismaMock();
    const notificacoes = comNotificacoes();

    await expect(
      new SaquesService(prisma, notificacoes).solicitar(USER_ID, {
        valor: 100,
        chavePixUsada: 'user@pix.com',
      }),
    ).rejects.toBeInstanceOf(AppError);
    expect(notificacoes.notificarAdmins).not.toHaveBeenCalled();
  });

  it('aprovar avisa quem pediu o saque', async () => {
    const prisma = buildPrismaMock();
    prisma.solicitacaoSaque.findUnique.mockResolvedValue(saquePendente);
    prisma.solicitacaoSaque.update.mockResolvedValue({ ...saquePendente, status: 'APROVADO' });
    const notificacoes = comNotificacoes();

    await new SaquesService(prisma, notificacoes).aprovar(SAQUE_ID, ADMIN_ID);

    expect(notificacoes.notificar).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, tipo: 'SAQUE_APROVADO', link: '/saques' }),
    );
  });

  it('rejeitar avisa quem pediu, com o motivo e a informação de que o valor voltou ao saldo', async () => {
    const prisma = buildPrismaMock();
    prisma.solicitacaoSaque.findUnique.mockResolvedValue(saquePendente);
    prisma.solicitacaoSaque.update.mockResolvedValue({ ...saquePendente, status: 'REJEITADO' });
    const notificacoes = comNotificacoes();

    await new SaquesService(prisma, notificacoes).rejeitar(SAQUE_ID, ADMIN_ID, {
      motivoRejeicao: 'Chave PIX divergente',
    });

    const chamada = notificacoes.notificar.mock.calls[0][0];
    expect(chamada).toMatchObject({ userId: USER_ID, tipo: 'SAQUE_REJEITADO' });
    expect(chamada.mensagem).toContain('Chave PIX divergente');
    expect(chamada.mensagem).toContain('voltou para o seu saldo');
  });
});

describe('SaquesService.marcarComoPago', () => {
  const saqueAprovado = {
    ...saquePendente,
    status: 'APROVADO',
    processadoEm: new Date('2026-10-02'),
  };

  it('Admin confirma o PIX transferido: vira PAGO com data, audita e devolve o nome de quem pediu', async () => {
    const prisma = buildPrismaMock();
    prisma.solicitacaoSaque.findUnique.mockResolvedValue(saqueAprovado);
    prisma.solicitacaoSaque.update.mockResolvedValue({
      ...saqueAprovado,
      status: 'PAGO',
      pagoEm: new Date('2026-10-03'),
      user: { nome: 'Bruno Locatario', condominio: { nome: 'Residencial Jardim Europa' } },
    });

    const result = await new SaquesService(prisma).marcarComoPago(SAQUE_ID, ADMIN_ID);

    expect(prisma.solicitacaoSaque.update).toHaveBeenCalledWith({
      where: { id: SAQUE_ID },
      data: { status: 'PAGO', pagoEm: expect.any(Date) },
      include: { user: { include: { condominio: true } } },
    });
    expect(result).toMatchObject({
      status: 'PAGO',
      solicitanteNome: 'Bruno Locatario',
      solicitanteCondominio: 'Residencial Jardim Europa',
    });
    expect(result.pagoEm).toEqual(new Date('2026-10-03'));
    expect(prisma.logAuditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ adminId: ADMIN_ID, acao: 'PAGAR_SAQUE', alvoId: SAQUE_ID }),
      }),
    );
  });

  it('só dá pra pagar um saque aprovado (pendente, rejeitado ou já pago respondem 409)', async () => {
    for (const status of ['PENDENTE', 'REJEITADO', 'PAGO']) {
      const prisma = buildPrismaMock();
      prisma.solicitacaoSaque.findUnique.mockResolvedValue({ ...saquePendente, status });

      await expect(
        new SaquesService(prisma).marcarComoPago(SAQUE_ID, ADMIN_ID),
      ).rejects.toBeInstanceOf(AppError);
      expect(prisma.solicitacaoSaque.update).not.toHaveBeenCalled();
    }
  });

  it('retorna 404 quando a solicitação não existe', async () => {
    const prisma = buildPrismaMock();
    prisma.solicitacaoSaque.findUnique.mockResolvedValue(null);

    await expect(
      new SaquesService(prisma).marcarComoPago('inexistente', ADMIN_ID),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('avisa quem pediu que o PIX foi enviado, com a chave mascarada', async () => {
    const prisma = buildPrismaMock();
    prisma.solicitacaoSaque.findUnique.mockResolvedValue(saqueAprovado);
    prisma.solicitacaoSaque.update.mockResolvedValue({
      ...saqueAprovado,
      status: 'PAGO',
      pagoEm: new Date(),
      user: { nome: 'Bruno Locatario', condominio: null },
    });
    const notificacoes = { notificar: jest.fn().mockResolvedValue(undefined) };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await new SaquesService(prisma, notificacoes as any).marcarComoPago(SAQUE_ID, ADMIN_ID);

    const chamada = notificacoes.notificar.mock.calls[0][0];
    expect(chamada).toMatchObject({ userId: USER_ID, tipo: 'SAQUE_PAGO', link: '/saques' });
    expect(chamada.mensagem).toContain('R$ 100,00');
    expect(chamada.mensagem).toContain('u***@pix.com');
    expect(chamada.mensagem).not.toContain('user@pix.com');
  });
});

describe('SaquesService — saque pago continua fora do saldo', () => {
  it('o saldo desconta saques APROVADO e PAGO (o valor sai do saldo já na aprovação)', async () => {
    const prisma = buildPrismaMock();
    comSaldoRecebido(prisma, 100);

    await new SaquesService(prisma).calcularSaldo(USER_ID);

    expect(prisma.solicitacaoSaque.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID, status: { in: ['APROVADO', 'PAGO'] } },
      }),
    );
  });
});
