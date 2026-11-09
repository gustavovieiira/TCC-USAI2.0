import { describe, expect, it } from 'vitest';
import { SaqueDTO } from '@/features/saques/saques.types';
import { buscarSaques, filtrarCondominios, filtrarHistorico } from './admin.filtros';
import { CondominioAdminDTO } from './admin.types';

const saque = (sobrescrever: Partial<SaqueDTO>): SaqueDTO => ({
  id: 's',
  userId: 'u',
  solicitanteNome: 'Ana Souza',
  solicitanteCondominio: 'Jardim Europa',
  valor: 10,
  chavePixUsada: 'ana@pix.com',
  status: 'PAGO',
  motivoRejeicao: null,
  createdAt: '2026-11-01T00:00:00.000Z',
  processadoEm: null,
  pagoEm: null,
  ...sobrescrever,
});

const cond = (sobrescrever: Partial<CondominioAdminDTO>): CondominioAdminDTO => ({
  id: 'c',
  nome: 'Jardim Europa',
  linkSlug: 'jardim-europa',
  pin: '1234',
  ativo: true,
  percentualComissao: 0,
  createdAt: '2026-11-01T00:00:00.000Z',
  ...sobrescrever,
});

describe('admin.filtros', () => {
  it('busca saques por nome, condomínio ou chave PIX, ignorando maiúsculas', () => {
    const ana = saque({});
    const beto = saque({
      id: 'b',
      solicitanteNome: 'Beto',
      solicitanteCondominio: 'Aurora',
      chavePixUsada: '11999990000',
    });
    expect(buscarSaques([ana, beto], '')).toHaveLength(2);
    expect(buscarSaques([ana, beto], 'ANA')).toEqual([ana]);
    expect(buscarSaques([ana, beto], 'aurora')).toEqual([beto]);
    expect(buscarSaques([ana, beto], '9999')).toEqual([beto]);
  });

  it('filtra o histórico por situação junto com a busca', () => {
    const pago = saque({});
    const rejeitado = saque({ id: 'r', status: 'REJEITADO' });
    expect(filtrarHistorico([pago, rejeitado], 'TODOS', '')).toHaveLength(2);
    expect(filtrarHistorico([pago, rejeitado], 'REJEITADO', '')).toEqual([rejeitado]);
    expect(filtrarHistorico([pago, rejeitado], 'PAGO', 'zzz')).toEqual([]);
  });

  it('filtra condomínios por busca (nome ou link) e por ativo ou inativo', () => {
    const a = cond({});
    const b = cond({ id: 'b', nome: 'Aurora', linkSlug: 'edificio-aurora', ativo: false });
    expect(filtrarCondominios([a, b], '', 'TODOS')).toHaveLength(2);
    expect(filtrarCondominios([a, b], '', 'ATIVOS')).toEqual([a]);
    expect(filtrarCondominios([a, b], '', 'INATIVOS')).toEqual([b]);
    expect(filtrarCondominios([a, b], 'edificio', 'TODOS')).toEqual([b]);
  });
});
