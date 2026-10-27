import { describe, expect, it } from 'vitest';
import {
  detalheMovimento,
  detalheMovimentoPlataforma,
  detalhePagamento,
  detalheSaqueAdmin,
} from './detalhes';
import { MovimentoExtratoDTO, PagamentoExtratoDTO, SaqueDTO } from './saques.types';

function valoresPor(detalhe: { linhas: { rotulo: string; valor: string }[] }) {
  return Object.fromEntries(detalhe.linhas.map((l) => [l.rotulo, l.valor]));
}

const saque: SaqueDTO = {
  id: 'saque-1',
  userId: 'user-1',
  solicitanteNome: 'Bruno Locatario',
  solicitanteCondominio: 'Residencial Jardim Europa',
  valor: 150,
  chavePixUsada: 'bruno@pix.com',
  status: 'PAGO',
  motivoRejeicao: null,
  createdAt: '2026-10-01T12:00:00.000Z',
  processadoEm: '2026-10-02T12:00:00.000Z',
  pagoEm: '2026-10-03T12:00:00.000Z',
};

describe('detalheSaqueAdmin', () => {
  it('saque pago vira recibo, com quem pediu, condomínio, chave PIX completa e protocolo', () => {
    const detalhe = detalheSaqueAdmin(saque);
    const v = valoresPor(detalhe);

    expect(detalhe.recibo).toBe(true);
    expect(detalhe.titulo).toBe('Recibo de pagamento de saque');
    expect(detalhe.protocolo).toBe('saque-1');
    expect(v['Solicitante']).toBe('Bruno Locatario');
    expect(v['Condomínio']).toBe('Residencial Jardim Europa');
    expect(v['Chave PIX']).toBe('bruno@pix.com');
    expect(v['Situação']).toBe('Pago');
    expect(v['PIX enviado em']).toBeDefined();
  });

  it('saque ainda não pago não gera recibo e não mostra datas que não existem', () => {
    const detalhe = detalheSaqueAdmin({
      ...saque,
      status: 'PENDENTE',
      processadoEm: null,
      pagoEm: null,
    });
    const v = valoresPor(detalhe);

    expect(detalhe.recibo).toBe(false);
    expect(detalhe.titulo).toBe('Detalhes do saque');
    expect(v['Decidido em']).toBeUndefined();
    expect(v['PIX enviado em']).toBeUndefined();
  });

  it('saque rejeitado mostra o motivo', () => {
    const detalhe = detalheSaqueAdmin({
      ...saque,
      status: 'REJEITADO',
      motivoRejeicao: 'Chave PIX divergente',
      pagoEm: null,
    });

    expect(detalhe.recibo).toBe(false);
    expect(valoresPor(detalhe)['Motivo da rejeição']).toBe('Chave PIX divergente');
  });
});

describe('detalheMovimento', () => {
  const recebimento: MovimentoExtratoDTO = {
    id: 'loc-1',
    tipo: 'RECEBIMENTO',
    data: '2026-10-03T12:00:00.000Z',
    descricao: 'Aluguel de "Furadeira"',
    contraparte: { id: 'u-2', nome: 'Carla Locataria' },
    valor: 90,
    valorBruto: 100,
    taxa: 10,
    periodo: { inicio: '2026-10-05T00:00:00.000Z', fim: '2026-10-07T00:00:00.000Z' },
    status: 'CONFIRMADO',
  };

  it('aluguel recebido sempre gera recibo, com a conta bruto − taxa = líquido e o período', () => {
    const detalhe = detalheMovimento(recebimento);
    const v = valoresPor(detalhe);

    expect(detalhe.recibo).toBe(true);
    expect(v['Pago por']).toBe('Carla Locataria');
    expect(v['Período do aluguel']).toBe('05/10/2026 a 07/10/2026');
    expect(v['Valor do aluguel']).toMatch(/100,00/);
    expect(v['Taxa']).toMatch(/10,00/);
    expect(v['Você recebeu']).toMatch(/90,00/);
  });

  it('saque pago gera recibo com a chave mascarada; em análise ou aprovado não', () => {
    const base: MovimentoExtratoDTO = {
      id: 'saque-1',
      tipo: 'SAQUE',
      data: '2026-10-05T12:00:00.000Z',
      descricao: 'Saque via PIX',
      contraparte: null,
      valor: -30,
      status: 'PAGO',
      chavePix: '****1234',
      pagoEm: '2026-10-06T12:00:00.000Z',
    };

    const pago = detalheMovimento(base);
    expect(pago.recibo).toBe(true);
    expect(valoresPor(pago)['Chave PIX']).toBe('****1234');
    expect(valoresPor(pago)['Valor']).toMatch(/30,00/);

    expect(detalheMovimento({ ...base, status: 'EM_ANALISE', pagoEm: null }).recibo).toBe(false);
    expect(detalheMovimento({ ...base, status: 'APROVADO', pagoEm: null }).recibo).toBe(false);
    expect(
      valoresPor(detalheMovimento({ ...base, status: 'APROVADO', pagoEm: null }))['Situação'],
    ).toBe('Aprovado — aguardando o PIX');
  });
});

describe('detalhePagamento', () => {
  const pagamento: PagamentoExtratoDTO = {
    id: 'p-1',
    data: '2026-10-02T12:00:00.000Z',
    descricao: 'Aluguel de "Escada"',
    contraparte: { id: 'u-3', nome: 'Davi Dono' },
    valor: 50,
    periodo: { inicio: '2026-10-10T00:00:00.000Z', fim: '2026-10-11T00:00:00.000Z' },
    status: 'CONFIRMADO',
  };

  it('pagamento confirmado gera recibo com a quem foi pago e o período', () => {
    const detalhe = detalhePagamento(pagamento);
    const v = valoresPor(detalhe);

    expect(detalhe.recibo).toBe(true);
    expect(v['Pago a']).toBe('Davi Dono');
    expect(v['Período do aluguel']).toBe('10/10/2026 a 11/10/2026');
    expect(v['Valor pago']).toMatch(/50,00/);
  });

  it('pagamento aguardando reembolso não gera recibo e explica o motivo', () => {
    const detalhe = detalhePagamento({ ...pagamento, status: 'EM_REEMBOLSO' });

    expect(detalhe.recibo).toBe(false);
    expect(valoresPor(detalhe)['Situação']).toMatch(/reembolso/);
  });
});

describe('detalheMovimento — comissão do condomínio', () => {
  const comissao: MovimentoExtratoDTO = {
    id: 'l-1',
    tipo: 'COMISSAO',
    data: '2026-10-03T12:00:00.000Z',
    descricao: 'Comissão do condomínio sobre o aluguel de "Furadeira"',
    contraparte: null,
    valor: 5,
    valorBruto: 100,
    taxa: 10,
    taxaPercentual: 10,
    divididoEntre: 2,
    periodo: { inicio: '2026-10-05T00:00:00.000Z', fim: '2026-10-07T00:00:00.000Z' },
    origem: {
      locacaoId: 'loc-1',
      itemTitulo: 'Furadeira',
      dono: { id: 'd-1', nome: 'Davi Dono' },
      locatario: { id: 'c-1', nome: 'Carla Locataria' },
    },
    status: 'CONFIRMADO',
  };

  it('vira recibo com a origem, a base de cálculo, a taxa, a divisão entre síndicos e a parte recebida', () => {
    const detalhe = detalheMovimento(comissao);
    const v = valoresPor(detalhe);

    expect(detalhe.recibo).toBe(true);
    expect(detalhe.titulo).toBe('Recibo de comissão do condomínio');
    expect(v['Aluguel do item']).toBe('Furadeira');
    expect(v['Dono do item']).toBe('Davi Dono');
    expect(v['Pago por']).toBe('Carla Locataria');
    expect(v['Período do aluguel']).toBe('05/10/2026 a 07/10/2026');
    expect(v['Base de cálculo (aluguel pago)']).toMatch(/100,00/);
    expect(v['Taxa do condomínio (10%)']).toMatch(/10,00/);
    expect(v['Dividida entre']).toBe('2 síndicos');
    expect(v['Comissão recebida']).toMatch(/5,00/);
    expect(detalhe.protocolo).toBe('l-1');
  });

  it('não mostra "dividida entre" quando só há um síndico', () => {
    const detalhe = detalheMovimento({ ...comissao, divididoEntre: 1, valor: 10 });

    expect(valoresPor(detalhe)['Dividida entre']).toBeUndefined();
  });
});

describe('detalhePagamento — quebra do que foi pago', () => {
  it('mostra quanto foi pro dono e quanto foi taxa do condomínio', () => {
    const detalhe = detalhePagamento({
      id: 'p-1',
      data: '2026-10-02T12:00:00.000Z',
      descricao: 'Aluguel de "Escada"',
      contraparte: { id: 'u-3', nome: 'Davi Dono' },
      valor: 100,
      taxa: 10,
      repasseDono: 90,
      taxaPercentual: 10,
      periodo: { inicio: '2026-10-10T00:00:00.000Z', fim: '2026-10-11T00:00:00.000Z' },
      status: 'CONFIRMADO',
    });
    const v = valoresPor(detalhe);

    expect(v['Foi para Davi Dono']).toMatch(/90,00/);
    expect(v['Taxa do condomínio (10%)']).toMatch(/10,00/);
  });
});

describe('detalheMovimentoPlataforma', () => {
  it('registro da conta da USAI: origem, base, taxa e valor retido; nunca é recibo', () => {
    const detalhe = detalheMovimentoPlataforma({
      id: 'm-1',
      data: '2026-10-03T12:00:00.000Z',
      descricao: 'Taxa sobre o aluguel de "Furadeira"',
      valor: 10,
      baseCalculo: 100,
      taxaPercentual: 10,
      origem: {
        locacaoId: 'loc-1',
        itemTitulo: 'Furadeira',
        dono: { id: 'd-1', nome: 'Davi Dono' },
        locatario: { id: 'c-1', nome: 'Carla Locataria' },
      },
    });
    const v = valoresPor(detalhe);

    expect(detalhe.recibo).toBe(false);
    expect(v['Aluguel do item']).toBe('Furadeira');
    expect(v['Base de cálculo (aluguel pago)']).toMatch(/100,00/);
    expect(v['Taxa aplicada']).toBe('10%');
    expect(v['Valor retido pela USAI']).toMatch(/10,00/);
  });

  it('lançamento sem origem nem taxa não quebra', () => {
    const detalhe = detalheMovimentoPlataforma({
      id: 'm-2',
      data: '2026-10-03T12:00:00.000Z',
      descricao: 'Ajuste',
      valor: 5,
      baseCalculo: null,
      taxaPercentual: null,
      origem: null,
    });

    expect(valoresPor(detalhe)['Valor retido pela USAI']).toMatch(/5,00/);
    expect(valoresPor(detalhe)['Taxa aplicada']).toBeUndefined();
  });
});
