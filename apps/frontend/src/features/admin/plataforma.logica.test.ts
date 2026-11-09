import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  deslocarMes,
  detalheRecebimento,
  filtrarAssinaturas,
  mesAtualBr,
  rotuloDoMes,
  situacaoDaAssinatura,
} from './plataforma.logica';
import { AssinaturaAdminDTO, RecebimentoDTO } from './plataforma.types';

afterEach(() => vi.useRealTimers());

function assinatura(extra: Partial<AssinaturaAdminDTO> = {}): AssinaturaAdminDTO {
  return {
    id: 'a-1',
    condominio: { id: 'c-1', nome: 'Residencial Aurora' },
    sindico: { nome: 'Sílvia Souza', email: 'silvia@exemplo.com' },
    plano: 'Condomínio',
    periodo: 'Mensal',
    valorCiclo: 299,
    status: 'ATIVA',
    ativaAte: '2026-12-10T15:00:00.000Z',
    diasRestantes: 30,
    ...extra,
  };
}

function recebimento(extra: Partial<RecebimentoDTO> = {}): RecebimentoDTO {
  return {
    id: 'r-1',
    numeroRecibo: 'USAI-ABCD1234',
    pagoEm: '2026-11-10T15:00:00.000Z',
    condominio: { id: 'c-1', nome: 'Residencial Aurora' },
    sindico: { nome: 'Sílvia Souza', email: 'silvia@exemplo.com', documento: '***.982.247-**' },
    plano: 'Condomínio',
    periodo: 'Mensal',
    valor: 299,
    taxaAsaas: 1.99,
    liquido: 297.01,
    dias: 30,
    vigenciaInicio: '2026-11-10T15:00:00.000Z',
    vigenciaFim: '2026-12-10T15:00:00.000Z',
    comprovanteUrl: 'https://asaas/i/pay_1',
    ...extra,
  };
}

function valoresPor(linhas: { rotulo: string; valor: string }[]) {
  return Object.fromEntries(linhas.map((l) => [l.rotulo, l.valor]));
}

describe('meses', () => {
  it('mesAtualBr usa o horário de Brasília (ainda é outubro às 23h do dia 31 em Brasília)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-01T02:30:00.000Z'));

    expect(mesAtualBr()).toBe('2026-10');
  });

  it('mesAtualBr devolve o mês do dia em Brasília', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T15:00:00.000Z'));

    expect(mesAtualBr()).toBe('2026-11');
  });

  it.each([
    ['2026-11', -1, '2026-10'],
    ['2026-11', 1, '2026-12'],
    ['2026-01', -1, '2025-12'],
    ['2026-12', 1, '2027-01'],
    ['2026-11', -12, '2025-11'],
    ['2026-11', 0, '2026-11'],
  ])('deslocarMes(%s, %i) = %s', (mes, delta, esperado) => {
    expect(deslocarMes(mes, delta)).toBe(esperado);
  });

  it('rotuloDoMes escreve o mês por extenso, em português', () => {
    expect(rotuloDoMes('2026-11')).toBe('novembro de 2026');
    expect(rotuloDoMes('2027-01')).toBe('janeiro de 2027');
  });
});

describe('filtrarAssinaturas', () => {
  const lista = [
    assinatura({ id: 'hoje', condominio: { id: 'c-a', nome: 'Hoje' }, diasRestantes: 0 }),
    assinatura({ id: 'em3', condominio: { id: 'c-b', nome: 'Em três' }, diasRestantes: 3 }),
    assinatura({ id: 'em7', condominio: { id: 'c-c', nome: 'Em sete' }, diasRestantes: 7 }),
    assinatura({ id: 'em12', condominio: { id: 'c-d', nome: 'Em doze' }, diasRestantes: 12 }),
    assinatura({ id: 'em30', condominio: { id: 'c-e', nome: 'Em trinta' }, diasRestantes: 30 }),
    assinatura({
      id: 'em31',
      condominio: { id: 'c-f', nome: 'Em trinta e um' },
      diasRestantes: 31,
    }),
    assinatura({ id: 'venceu', condominio: { id: 'c-g', nome: 'Venceu' }, diasRestantes: -2 }),
    assinatura({
      id: 'suspensa',
      condominio: { id: 'c-h', nome: 'Suspensa' },
      status: 'SUSPENSA',
      diasRestantes: -10,
    }),
    assinatura({
      id: 'aguardando',
      condominio: { id: 'c-i', nome: 'Aguardando' },
      status: 'AGUARDANDO_PAGAMENTO',
      ativaAte: null,
      diasRestantes: null,
    }),
  ];
  const ids = (itens: AssinaturaAdminDTO[]) => itens.map((i) => i.id);

  it('TODAS devolve tudo', () => {
    expect(filtrarAssinaturas(lista, 'TODAS')).toHaveLength(9);
  });

  it('vencem em 7, 15 e 30 dias: só ativas, de hoje até o limite (inclusive), sem as já vencidas', () => {
    expect(ids(filtrarAssinaturas(lista, 'VENCE_7'))).toEqual(['hoje', 'em3', 'em7']);
    expect(ids(filtrarAssinaturas(lista, 'VENCE_15'))).toEqual(['hoje', 'em3', 'em7', 'em12']);
    expect(ids(filtrarAssinaturas(lista, 'VENCE_30'))).toEqual([
      'hoje',
      'em3',
      'em7',
      'em12',
      'em30',
    ]);
  });

  it('vencidas inclui as ativas que passaram da data e as suspensas', () => {
    expect(ids(filtrarAssinaturas(lista, 'VENCIDAS'))).toEqual(['venceu', 'suspensa']);
  });

  it('aguardando pagamento', () => {
    expect(ids(filtrarAssinaturas(lista, 'AGUARDANDO'))).toEqual(['aguardando']);
  });

  it('a busca ignora maiúsculas e acentos e olha condomínio, síndico e e-mail', () => {
    expect(ids(filtrarAssinaturas(lista, 'TODAS', 'TRES'))).toEqual(['em3']);
    expect(ids(filtrarAssinaturas(lista, 'TODAS', 'silvia@'))).toHaveLength(9);
    expect(ids(filtrarAssinaturas(lista, 'TODAS', 'SILVIA SOUZA'))).toHaveLength(9);
    expect(filtrarAssinaturas(lista, 'TODAS', 'nenhum')).toEqual([]);
  });

  it('a busca e o filtro valem juntos', () => {
    expect(ids(filtrarAssinaturas(lista, 'VENCIDAS', 'suspensa'))).toEqual(['suspensa']);
    expect(filtrarAssinaturas(lista, 'VENCE_7', 'suspensa')).toEqual([]);
  });
});

describe('situacaoDaAssinatura', () => {
  it.each([
    [
      { status: 'AGUARDANDO_PAGAMENTO', diasRestantes: null },
      'Aguardando o 1º pagamento',
      'neutro',
    ],
    [{ status: 'SUSPENSA', diasRestantes: -4 }, 'Suspensa, venceu há 4 dias', 'perigo'],
    [{ status: 'SUSPENSA', diasRestantes: -1 }, 'Suspensa, venceu há 1 dia', 'perigo'],
    [{ status: 'SUSPENSA', diasRestantes: null }, 'Suspensa', 'perigo'],
    [{ status: 'ATIVA', diasRestantes: -2 }, 'Vencida há 2 dias', 'perigo'],
    [{ status: 'ATIVA', diasRestantes: -1 }, 'Vencida há 1 dia', 'perigo'],
    [{ status: 'ATIVA', diasRestantes: 0 }, 'Vence hoje', 'perigo'],
    [{ status: 'ATIVA', diasRestantes: 1 }, 'Vence em 1 dia', 'atencao'],
    [{ status: 'ATIVA', diasRestantes: 7 }, 'Vence em 7 dias', 'atencao'],
    [{ status: 'ATIVA', diasRestantes: 8 }, 'Vence em 8 dias', 'ok'],
    [{ status: 'ATIVA', diasRestantes: null }, 'Ativa', 'ok'],
  ] as const)('%j vira "%s" (%s)', (parcial, rotulo, tom) => {
    expect(situacaoDaAssinatura(assinatura({ ...parcial }))).toEqual({ rotulo, tom });
  });
});

describe('detalheRecebimento', () => {
  it('é um recibo, com o número da assinatura como protocolo e a conta valor − taxa = líquido', () => {
    const detalhe = detalheRecebimento(recebimento());
    const v = valoresPor(detalhe.linhas);

    expect(detalhe.recibo).toBe(true);
    expect(detalhe.titulo).toBe('Recibo de assinatura da plataforma');
    expect(detalhe.protocolo).toBe('USAI-ABCD1234');
    expect(v.Recibo).toBe('USAI-ABCD1234');
    expect(v['Condomínio']).toBe('Residencial Aurora');
    expect(v['Síndico']).toBe('Sílvia Souza');
    expect(v.Documento).toBe('***.982.247-**');
    expect(v.Plano).toBe('Condomínio (Mensal)');
    expect(v['Forma de pagamento']).toBe('PIX');
    expect(v['Valor pago']).toMatch(/299,00/);
    expect(v['Taxa do PIX (Asaas)']).toMatch(/1,99/);
    expect(v['Líquido para a plataforma']).toMatch(/297,01/);
    expect(v['Vigência paga']).toMatch(/\d{2}\/\d{2}\/2026 a \d{2}\/\d{2}\/2026/);
  });

  it('sem a taxa gravada e sem a vigência, mostra só o que se sabe (e os dias liberados)', () => {
    const v = valoresPor(
      detalheRecebimento(
        recebimento({
          taxaAsaas: null,
          liquido: null,
          vigenciaInicio: null,
          vigenciaFim: null,
          sindico: { nome: 'Sílvia Souza', email: 's@exemplo.com', documento: null },
        }),
      ).linhas,
    );

    expect(v['Taxa do PIX (Asaas)']).toBeUndefined();
    expect(v['Líquido para a plataforma']).toBeUndefined();
    expect(v['Vigência paga']).toBeUndefined();
    expect(v.Documento).toBeUndefined();
    expect(v['Dias liberados']).toBe('30 dias');
    expect(v['Valor pago']).toMatch(/299,00/);
  });
});
