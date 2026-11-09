import { NotFoundError } from '@/common/errors';
import { PlataformaService } from '@/modules/plataforma/plataforma.service';

function buildPrismaMock() {
  return {
    cobrancaAssinatura: { findMany: jest.fn().mockResolvedValue([]) },
    despesaPlataforma: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    assinatura: { findMany: jest.fn().mockResolvedValue([]) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const UM_DIA = 24 * 60 * 60 * 1000;

function cobranca(extra: Record<string, unknown> = {}) {
  return {
    id: 'abcd1234-ef56-7890-abcd-ef1234567890',
    asaasChargeId: 'pay_1',
    invoiceUrl: 'https://asaas/i/pay_1',
    valor: 299,
    periodoCodigo: 'MENSAL',
    dias: 30,
    status: 'PAGO',
    pagoEm: new Date('2026-11-10T15:00:00.000Z'),
    taxaAsaas: 1.99,
    ativaAteApos: new Date('2026-12-10T15:00:00.000Z'),
    assinatura: {
      planoCodigo: 'CONDOMINIO',
      condominio: { id: 'cond-1', nome: 'Residencial Aurora' },
      responsavel: { nome: 'Sílvia Souza', email: 'silvia@exemplo.com', cpf: '52998224725' },
    },
    ...extra,
  };
}

describe('PlataformaService.vendasDoMes', () => {
  it('busca o mês pedido em horário de Brasília: de 1º do mês (00h) até 1º do mês seguinte (00h)', async () => {
    const prisma = buildPrismaMock();

    await new PlataformaService(prisma).vendasDoMes('2026-11');

    const filtro = prisma.cobrancaAssinatura.findMany.mock.calls[0][0].where;
    expect(filtro.status).toBe('PAGO');
    expect(filtro.pagoEm.gte.toISOString()).toBe('2026-11-01T03:00:00.000Z');
    expect(filtro.pagoEm.lt.toISOString()).toBe('2026-12-01T03:00:00.000Z');
    const filtroDespesas = prisma.despesaPlataforma.findMany.mock.calls[0][0].where;
    expect(filtroDespesas.data.gte.toISOString()).toBe('2026-11-01T03:00:00.000Z');
    expect(filtroDespesas.data.lt.toISOString()).toBe('2026-12-01T03:00:00.000Z');
  });

  it('dezembro termina em 1º de janeiro do ano seguinte', async () => {
    const prisma = buildPrismaMock();

    await new PlataformaService(prisma).vendasDoMes('2026-12');

    const filtro = prisma.cobrancaAssinatura.findMany.mock.calls[0][0].where;
    expect(filtro.pagoEm.lt.toISOString()).toBe('2027-01-01T03:00:00.000Z');
  });

  it('sem informar o mês, usa o mês atual', async () => {
    const prisma = buildPrismaMock();

    const resultado = await new PlataformaService(prisma).vendasDoMes();

    expect(resultado.mes).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });

  it('entrou, taxas do Asaas, despesas e resultado: entrou − taxas − despesas', async () => {
    const prisma = buildPrismaMock();
    prisma.cobrancaAssinatura.findMany.mockResolvedValue([
      cobranca(),
      cobranca({ id: 'zzzz9999-0000-0000-0000-000000000000', valor: 149, taxaAsaas: 1.99 }),
    ]);
    prisma.despesaPlataforma.findMany.mockResolvedValue([
      {
        id: 'd-1',
        data: new Date('2026-11-05T15:00:00.000Z'),
        valor: 60,
        descricao: 'Servidor',
        categoria: 'SERVIDOR',
      },
    ]);

    const { resumo } = await new PlataformaService(prisma).vendasDoMes('2026-11');

    expect(resumo).toEqual({
      entrou: 448,
      taxasAsaas: 3.98,
      despesas: 60,
      resultado: 384.02,
      pagamentos: 2,
      taxasNaoInformadas: 0,
    });
  });

  it('mensalidade sem a taxa gravada conta como taxa 0 e é sinalizada', async () => {
    const prisma = buildPrismaMock();
    prisma.cobrancaAssinatura.findMany.mockResolvedValue([
      cobranca({ taxaAsaas: null, ativaAteApos: null }),
    ]);

    const { resumo, recebimentos } = await new PlataformaService(prisma).vendasDoMes('2026-11');

    expect(resumo.taxasNaoInformadas).toBe(1);
    expect(resumo.resultado).toBe(299);
    expect(recebimentos[0]).toMatchObject({
      taxaAsaas: null,
      liquido: null,
      vigenciaInicio: null,
      vigenciaFim: null,
    });
  });

  it('cada recebimento traz os dados do recibo: número, síndico (documento mascarado), plano, valor, taxa, líquido e vigência', async () => {
    const prisma = buildPrismaMock();
    prisma.cobrancaAssinatura.findMany.mockResolvedValue([cobranca()]);

    const { recebimentos } = await new PlataformaService(prisma).vendasDoMes('2026-11');

    const r = recebimentos[0];
    expect(r.numeroRecibo).toBe('USAI-ABCD1234');
    expect(r.condominio).toEqual({ id: 'cond-1', nome: 'Residencial Aurora' });
    expect(r.sindico).toEqual({
      nome: 'Sílvia Souza',
      email: 'silvia@exemplo.com',
      documento: '***.982.247-**',
    });
    expect(r.plano).toBe('Condomínio');
    expect(r.periodo).toBe('Mensal');
    expect(r.valor).toBe(299);
    expect(r.taxaAsaas).toBe(1.99);
    expect(r.liquido).toBe(297.01);
    expect(r.dias).toBe(30);
    expect(r.vigenciaFim).toEqual(new Date('2026-12-10T15:00:00.000Z'));
    expect(r.vigenciaInicio).toEqual(new Date(r.vigenciaFim!.getTime() - 30 * UM_DIA));
    expect(r.comprovanteUrl).toBe('https://asaas/i/pay_1');
  });

  it('mês sem nada: tudo zerado', async () => {
    const { resumo, recebimentos, despesas } = await new PlataformaService(
      buildPrismaMock(),
    ).vendasDoMes('2026-01');

    expect(resumo).toEqual({
      entrou: 0,
      taxasAsaas: 0,
      despesas: 0,
      resultado: 0,
      pagamentos: 0,
      taxasNaoInformadas: 0,
    });
    expect(recebimentos).toEqual([]);
    expect(despesas).toEqual([]);
  });

  it('despesas maiores que o que entrou dão resultado negativo', async () => {
    const prisma = buildPrismaMock();
    prisma.despesaPlataforma.findMany.mockResolvedValue([
      { id: 'd-1', data: new Date(), valor: 70, descricao: 'Servidor', categoria: 'SERVIDOR' },
    ]);

    const { resumo } = await new PlataformaService(prisma).vendasDoMes('2026-11');

    expect(resumo.resultado).toBe(-70);
  });
});

describe('PlataformaService.listarAssinaturas', () => {
  function assinatura(extra: Record<string, unknown>) {
    return {
      id: 'a-1',
      planoCodigo: 'CONDOMINIO',
      periodoCodigo: 'MENSAL',
      valorCiclo: 299,
      status: 'ATIVA',
      ativaAte: null,
      condominio: { id: 'c-1', nome: 'Aurora' },
      responsavel: { nome: 'Sílvia', email: 's@exemplo.com' },
      ...extra,
    };
  }

  it('ordena do que vence primeiro para o que vence depois, e quem ainda não tem vigência vai por último', async () => {
    const prisma = buildPrismaMock();
    const agora = Date.now();
    prisma.assinatura.findMany.mockResolvedValue([
      assinatura({
        id: 'longe',
        condominio: { id: 'c-3', nome: 'Longe' },
        ativaAte: new Date(agora + 40 * UM_DIA),
      }),
      assinatura({
        id: 'sem',
        condominio: { id: 'c-4', nome: 'Aguardando' },
        status: 'AGUARDANDO_PAGAMENTO',
      }),
      assinatura({
        id: 'perto',
        condominio: { id: 'c-2', nome: 'Perto' },
        ativaAte: new Date(agora + 3 * UM_DIA),
      }),
    ]);

    const { itens } = await new PlataformaService(prisma).listarAssinaturas();

    expect(itens.map((i) => i.id)).toEqual(['perto', 'longe', 'sem']);
  });

  it('calcula os dias restantes (negativo quando já venceu) e traduz plano e período', async () => {
    const prisma = buildPrismaMock();
    const agora = Date.now();
    prisma.assinatura.findMany.mockResolvedValue([
      assinatura({ id: 'em-5', ativaAte: new Date(agora + 5 * UM_DIA - 1000) }),
      assinatura({ id: 'venceu', ativaAte: new Date(agora - 2 * UM_DIA + 1000) }),
    ]);

    const { itens } = await new PlataformaService(prisma).listarAssinaturas();

    const venceu = itens.find((i) => i.id === 'venceu')!;
    const em5 = itens.find((i) => i.id === 'em-5')!;
    expect(em5.diasRestantes).toBe(5);
    expect(venceu.diasRestantes).toBe(-1);
    expect(em5.plano).toBe('Condomínio');
    expect(em5.periodo).toBe('Mensal');
    expect(em5.valorCiclo).toBe(299);
    expect(em5.sindico).toEqual({ nome: 'Sílvia', email: 's@exemplo.com' });
  });

  it('o resumo conta ativas, aguardando pagamento, suspensas e as ativas que já passaram da data', async () => {
    const prisma = buildPrismaMock();
    const agora = Date.now();
    prisma.assinatura.findMany.mockResolvedValue([
      assinatura({ id: '1', ativaAte: new Date(agora + 10 * UM_DIA) }),
      assinatura({ id: '2', ativaAte: new Date(agora - 3 * UM_DIA) }),
      assinatura({ id: '3', status: 'SUSPENSA', ativaAte: new Date(agora - 20 * UM_DIA) }),
      assinatura({ id: '4', status: 'AGUARDANDO_PAGAMENTO' }),
    ]);

    const { resumo } = await new PlataformaService(prisma).listarAssinaturas();

    expect(resumo).toEqual({
      total: 4,
      ativas: 2,
      aguardandoPagamento: 1,
      suspensas: 1,
      vencidas: 1,
    });
  });
});

describe('PlataformaService: despesas', () => {
  it('lança a despesa no meio-dia de Brasília do dia informado e guarda quem lançou', async () => {
    const prisma = buildPrismaMock();
    prisma.despesaPlataforma.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: 'd-1', ...data }),
    );

    const despesa = await new PlataformaService(prisma).criarDespesa(
      { data: '2026-11-05', valor: 60.5, descricao: 'Servidor', categoria: 'SERVIDOR' },
      'admin-1',
    );

    const gravado = prisma.despesaPlataforma.create.mock.calls[0][0].data;
    expect(gravado.data.toISOString()).toBe('2026-11-05T15:00:00.000Z');
    expect(gravado.criadoPorId).toBe('admin-1');
    expect(despesa).toMatchObject({ id: 'd-1', valor: 60.5, categoria: 'SERVIDOR' });
  });

  it('remove uma despesa existente', async () => {
    const prisma = buildPrismaMock();
    prisma.despesaPlataforma.findUnique.mockResolvedValue({ id: 'd-1' });

    await new PlataformaService(prisma).removerDespesa('d-1');

    expect(prisma.despesaPlataforma.delete).toHaveBeenCalledWith({ where: { id: 'd-1' } });
  });

  it('remover uma despesa que não existe dá 404 e não apaga nada', async () => {
    const prisma = buildPrismaMock();
    prisma.despesaPlataforma.findUnique.mockResolvedValue(null);

    await expect(new PlataformaService(prisma).removerDespesa('nada')).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(prisma.despesaPlataforma.delete).not.toHaveBeenCalled();
  });
});
