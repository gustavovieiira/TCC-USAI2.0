import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ListaExtrato } from './ExtratoView';
import {
  dentroDoPeriodo,
  filtrarMovimentos,
  filtrarPagamentos,
  totaisDosMovimentos,
} from './extrato.filtros';
import { ExtratoDTO, MovimentoExtratoDTO, PagamentoExtratoDTO } from './saques.types';

const AGORA = new Date('2026-11-05T12:00:00.000Z');

function mov(sobrescrever: Partial<MovimentoExtratoDTO>): MovimentoExtratoDTO {
  return {
    id: 'm',
    tipo: 'RECEBIMENTO',
    data: '2026-11-04T12:00:00.000Z',
    descricao: 'Aluguel de "Furadeira"',
    contraparte: { id: 'u', nome: 'Carla' },
    valor: 90,
    status: 'CONFIRMADO',
    ...sobrescrever,
  };
}

const recente = mov({ id: 'a', descricao: 'Aluguel recente', valor: 90 });
const antigo = mov({ id: 'b', descricao: 'Aluguel antigo', data: '2026-07-01T12:00:00.000Z' });
const comissao = mov({ id: 'c', tipo: 'COMISSAO', descricao: 'Comissão de outubro', valor: 5 });
const saque = mov({
  id: 'd',
  tipo: 'SAQUE',
  descricao: 'Saque via PIX',
  contraparte: null,
  valor: -30,
  status: 'PAGO',
});
const saqueRejeitado = mov({
  id: 'e',
  tipo: 'SAQUE',
  descricao: 'Saque rejeitado',
  contraparte: null,
  valor: -20,
  status: 'REJEITADO',
});

describe('extrato.filtros', () => {
  it('"todo o período" aceita qualquer data', () => {
    expect(dentroDoPeriodo('2020-01-01T00:00:00.000Z', 'TUDO', AGORA)).toBe(true);
  });

  it('conta os dias a partir de agora', () => {
    expect(dentroDoPeriodo('2026-10-31T12:00:00.000Z', '7', AGORA)).toBe(true);
    expect(dentroDoPeriodo('2026-10-20T12:00:00.000Z', '7', AGORA)).toBe(false);
    expect(dentroDoPeriodo('2026-10-20T12:00:00.000Z', '30', AGORA)).toBe(true);
    expect(dentroDoPeriodo('2026-07-01T12:00:00.000Z', '90', AGORA)).toBe(false);
  });

  it('filtra as movimentações por tipo e por período, juntos', () => {
    const todos = [recente, antigo, comissao, saque];
    expect(filtrarMovimentos(todos, 'TODOS', 'TUDO', AGORA)).toHaveLength(4);
    expect(filtrarMovimentos(todos, 'RECEBIMENTO', 'TUDO', AGORA)).toEqual([recente, antigo]);
    expect(filtrarMovimentos(todos, 'RECEBIMENTO', '30', AGORA)).toEqual([recente]);
    expect(filtrarMovimentos(todos, 'SAQUE', '7', AGORA)).toEqual([saque]);
  });

  it('filtra os pagamentos feitos pelo período', () => {
    const pago = (id: string, data: string) =>
      ({ id, data, descricao: id, contraparte: null, valor: 10 }) as PagamentoExtratoDTO;
    const lista = [
      pago('novo', '2026-11-01T00:00:00.000Z'),
      pago('velho', '2026-01-01T00:00:00.000Z'),
    ];
    expect(filtrarPagamentos(lista, '30', AGORA).map((p) => p.id)).toEqual(['novo']);
  });

  it('soma o que entrou e o que saiu, ignorando saque rejeitado (o valor voltou)', () => {
    expect(totaisDosMovimentos([recente, comissao, saque, saqueRejeitado])).toEqual({
      entrou: 95,
      saiu: 30,
    });
  });
});

function extratoCom(movimentos: MovimentoExtratoDTO[]): ExtratoDTO {
  return {
    resumo: {
      saldoDisponivel: 0,
      totalRecebido: 0,
      totalComissoes: 0,
      totalSacado: 0,
      aPagar: 0,
      emAnalise: 0,
    },
    movimentos,
    pagamentos: [],
  };
}

describe('ListaExtrato: filtros', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AGORA);
  });
  afterEach(() => vi.useRealTimers());

  it('mostra só o tipo escolhido e a soma do que está na tela', async () => {
    const user = userEvent.setup();
    render(<ListaExtrato extrato={extratoCom([recente, saque, comissao])} />);

    expect(screen.getByText('Aluguel recente')).toBeInTheDocument();
    expect(screen.getByText('Saque via PIX')).toBeInTheDocument();

    const grupo = screen.getByRole('group', { name: 'Filtrar movimentações por tipo' });
    await user.click(within(grupo).getByRole('button', { name: /Saques/ }));

    expect(screen.queryByText('Aluguel recente')).not.toBeInTheDocument();
    expect(screen.getByText('Saque via PIX')).toBeInTheDocument();
    expect(screen.getByText(/1 movimentação/)).toHaveTextContent(/saiu\s+R\$\s*30,00/);
  });

  it('só oferece o filtro de comissões quando existe alguma comissão', () => {
    render(<ListaExtrato extrato={extratoCom([recente, saque])} />);
    const grupo = screen.getByRole('group', { name: 'Filtrar movimentações por tipo' });
    expect(within(grupo).queryByRole('button', { name: /Comissões/ })).not.toBeInTheDocument();
  });

  it('filtra por período, avisa quando não sobra nada e limpa os filtros', async () => {
    const user = userEvent.setup();
    render(<ListaExtrato extrato={extratoCom([antigo])} />);

    await user.selectOptions(screen.getByLabelText('Período'), '7');
    expect(screen.getByText('Nada com esses filtros')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(screen.getByText('Aluguel antigo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();
  });

  it('não mostra filtros quando ainda não há movimentação', () => {
    render(<ListaExtrato extrato={extratoCom([])} />);
    expect(screen.getByText('Nenhuma movimentação ainda')).toBeInTheDocument();
    expect(screen.queryByLabelText('Período')).not.toBeInTheDocument();
  });
});
