import {
  dividirTaxa,
  registrarPagamentoConfirmado,
  PagamentoConfirmado,
} from '@/modules/lancamentos/lancamentos.service';

function buildTxMock(sindicos: { id: string }[]) {
  return {
    user: { findMany: jest.fn().mockResolvedValue(sindicos) },
    lancamento: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const pagamento: PagamentoConfirmado = {
  locacaoId: 'loc-1',
  itemTitulo: 'Furadeira Bosch',
  condominioId: 'cond-1',
  donoId: 'dono-1',
  locatarioId: 'locatario-1',
  valorBruto: 100,
  taxa: 10,
  valorLiquido: 90,
};

function lancamentosGravados(tx: ReturnType<typeof buildTxMock>) {
  return tx.lancamento.createMany.mock.calls[0][0].data as Record<string, unknown>[];
}

describe('dividirTaxa', () => {
  it('divide igualmente quando fecha em centavos', () => {
    expect(dividirTaxa(10, 2)).toEqual([5, 5]);
    expect(dividirTaxa(10, 1)).toEqual([10]);
  });

  it('o que sobra da divisão vai, um centavo por vez, pros primeiros — a soma é sempre a taxa inteira', () => {
    expect(dividirTaxa(10, 3)).toEqual([3.34, 3.33, 3.33]);
    expect(dividirTaxa(0.1, 3)).toEqual([0.04, 0.03, 0.03]);

    for (const [taxa, n] of [
      [10, 3],
      [3.33, 4],
      [0.07, 5],
      [123.45, 7],
    ] as const) {
      const partes = dividirTaxa(taxa, n);
      expect(partes).toHaveLength(n);
      expect(Math.round(partes.reduce((t, p) => t + p, 0) * 100)).toBe(Math.round(taxa * 100));
    }
  });
});

describe('registrarPagamentoConfirmado', () => {
  it('um síndico ativo: o dono recebe o líquido, o síndico recebe os 10% e o locatário ganha o registro do que pagou', async () => {
    const tx = buildTxMock([{ id: 'sindico-1' }]);

    const resultado = await registrarPagamentoConfirmado(tx, pagamento);

    const dados = lancamentosGravados(tx);
    expect(dados).toHaveLength(3);
    expect(dados).toContainEqual(
      expect.objectContaining({
        userId: 'dono-1',
        tipo: 'ALUGUEL_RECEBIDO',
        valor: 90,
        locacaoId: 'loc-1',
        baseCalculo: 100,
        taxaPercentual: 10,
      }),
    );
    expect(dados).toContainEqual(
      expect.objectContaining({
        userId: 'sindico-1',
        tipo: 'COMISSAO_CONDOMINIO',
        valor: 10,
        divididoEntre: 1,
        baseCalculo: 100,
        taxaPercentual: 10,
        locacaoId: 'loc-1',
        condominioId: 'cond-1',
      }),
    );
    expect(dados).toContainEqual(
      expect.objectContaining({
        userId: 'locatario-1',
        tipo: 'ALUGUEL_PAGO',
        valor: 100,
        afetaSaldo: false,
      }),
    );
    expect(resultado).toEqual({
      comissoes: [{ userId: 'sindico-1', valor: 10 }],
      retidoPelaPlataforma: 0,
    });
  });

  it('vários síndicos ativos: a taxa é dividida igualmente e cada um registra em quantos foi dividida', async () => {
    const tx = buildTxMock([{ id: 's-1' }, { id: 's-2' }, { id: 's-3' }]);

    const resultado = await registrarPagamentoConfirmado(tx, pagamento);

    const comissoes = lancamentosGravados(tx).filter((l) => l.tipo === 'COMISSAO_CONDOMINIO');
    expect(comissoes.map((c) => [c.userId, c.valor, c.divididoEntre])).toEqual([
      ['s-1', 3.34, 3],
      ['s-2', 3.33, 3],
      ['s-3', 3.33, 3],
    ]);
    expect(resultado.comissoes.reduce((t, c) => t + c.valor, 0)).toBeCloseTo(10, 2);
  });

  it('condomínio sem síndico ativo: a taxa inteira fica com a plataforma (userId nulo) e isso fica escrito', async () => {
    const tx = buildTxMock([]);

    const resultado = await registrarPagamentoConfirmado(tx, pagamento);

    const dados = lancamentosGravados(tx);
    expect(dados.filter((l) => l.tipo === 'COMISSAO_CONDOMINIO')).toHaveLength(0);
    expect(dados).toContainEqual(
      expect.objectContaining({
        userId: null,
        tipo: 'TAXA_PLATAFORMA',
        valor: 10,
        baseCalculo: 100,
        taxaPercentual: 10,
        descricao: expect.stringContaining('sem síndico'),
      }),
    );
    expect(resultado).toEqual({ comissoes: [], retidoPelaPlataforma: 10 });
  });

  it('só considera síndicos ATIVOS do MESMO condomínio, em ordem de cadastro', async () => {
    const tx = buildTxMock([{ id: 's-1' }]);

    await registrarPagamentoConfirmado(tx, pagamento);

    expect(tx.user.findMany).toHaveBeenCalledWith({
      where: { papel: 'SINDICO', ativo: true, condominioId: 'cond-1' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
  });

  it('a soma do que entra nas contas (líquido + comissões/taxa) fecha com o que o locatário pagou', async () => {
    for (const sindicos of [[], [{ id: 'a' }], [{ id: 'a' }, { id: 'b' }, { id: 'c' }]]) {
      const tx = buildTxMock(sindicos);
      await registrarPagamentoConfirmado(tx, {
        ...pagamento,
        valorBruto: 33.33,
        taxa: 3.33,
        valorLiquido: 30,
      });

      const entrou = lancamentosGravados(tx)
        .filter((l) => l.tipo !== 'ALUGUEL_PAGO')
        .reduce((t, l) => t + Number(l.valor), 0);

      expect(Math.round(entrou * 100)).toBe(3333);
    }
  });

  it('título de item enorme é cortado na descrição (cabe na coluna)', async () => {
    const tx = buildTxMock([]);

    await registrarPagamentoConfirmado(tx, { ...pagamento, itemTitulo: 'X'.repeat(300) });

    for (const l of lancamentosGravados(tx)) {
      expect((l.descricao as string).length).toBeLessThan(191);
    }
  });
});
