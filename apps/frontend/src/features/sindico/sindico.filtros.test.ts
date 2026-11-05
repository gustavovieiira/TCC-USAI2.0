import { describe, expect, it } from 'vitest';
import {
  filtrarLocacoes,
  filtrarMoradores,
  idsEmLocacao,
  janelasDoPredio,
} from './sindico.filtros';
import { LocacaoAtivaDTO, MoradorDTO } from './sindico.types';

const ana: MoradorDTO = {
  id: 'a',
  nome: 'Ana Souza',
  email: 'ana@x.com',
  apartamento: '101',
  createdAt: '2026-01-01T00:00:00.000Z',
};
const beto: MoradorDTO = {
  ...ana,
  id: 'b',
  nome: 'Beto Lima',
  email: 'beto@x.com',
  apartamento: null,
};

function locacao(sobrescrever: Partial<LocacaoAtivaDTO>): LocacaoAtivaDTO {
  return {
    id: 'l',
    status: 'PAGA',
    dataInicio: '2026-11-01T00:00:00.000Z',
    dataFim: '2026-11-03T00:00:00.000Z',
    valorTotal: 10,
    item: { id: 'i', titulo: 'Furadeira', ownerId: 'a' },
    locatario: { id: 'c', nome: 'Caio' },
    ...sobrescrever,
  };
}

describe('sindico.filtros', () => {
  it('junta donos e locatários das locações ativas', () => {
    expect(idsEmLocacao([locacao({})])).toEqual(new Set(['a', 'c']));
  });

  it('filtra moradores pela busca (nome, e-mail, apto) e por estar em locação', () => {
    const emLocacao = new Set(['a']);
    expect(filtrarMoradores([ana, beto], '', 'TODOS', emLocacao)).toHaveLength(2);
    expect(filtrarMoradores([ana, beto], 'beto@', 'TODOS', emLocacao)).toEqual([beto]);
    expect(filtrarMoradores([ana, beto], '101', 'TODOS', emLocacao)).toEqual([ana]);
    expect(filtrarMoradores([ana, beto], '', 'EM_LOCACAO', emLocacao)).toEqual([ana]);
    expect(filtrarMoradores([ana, beto], 'beto', 'EM_LOCACAO', emLocacao)).toEqual([]);
  });

  it('filtra locações por situação e por item ou locatário', () => {
    const paga = locacao({ id: '1' });
    const andamento = locacao({
      id: '2',
      status: 'EM_ANDAMENTO',
      item: { id: 'j', titulo: 'Escada', ownerId: 'a' },
    });
    expect(filtrarLocacoes([paga, andamento], '', 'TODAS')).toHaveLength(2);
    expect(filtrarLocacoes([paga, andamento], '', 'EM_ANDAMENTO')).toEqual([andamento]);
    expect(filtrarLocacoes([paga, andamento], 'escada', 'TODAS')).toEqual([andamento]);
    expect(filtrarLocacoes([paga, andamento], 'caio', 'PAGA')).toEqual([paga]);
  });

  it('janelas do prédio: uma acesa por morador, vagas apagadas e teto de 40', () => {
    expect(janelasDoPredio(3, 10)).toEqual({ total: 10, acesas: 3 });
    expect(janelasDoPredio(0, 10)).toEqual({ total: 10, acesas: 0 });
    expect(janelasDoPredio(2, null)).toEqual({ total: 8, acesas: 2 });
    expect(janelasDoPredio(50, 100)).toEqual({ total: 40, acesas: 20 });
    expect(janelasDoPredio(1, 500)).toEqual({ total: 40, acesas: 1 });
  });
});
