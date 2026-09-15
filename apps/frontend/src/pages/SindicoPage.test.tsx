import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SindicoPage } from './SindicoPage';
import * as sindicoApi from '@/features/sindico/sindico.api';
import { CondominioDTO, LocacaoAtivaDTO, MoradorDTO } from '@/features/sindico/sindico.types';

const condominio: CondominioDTO = {
  id: 'cond-1',
  nome: 'Residencial Jardim Europa',
  linkSlug: 'residencial-jardim-europa',
  pin: '1234',
  ativo: true,
};

const morador: MoradorDTO = {
  id: 'user-1',
  nome: 'Ana Proprietária',
  email: 'ana@example.com',
  apartamento: '101',
  createdAt: '2026-09-01T00:00:00.000Z',
};

const locacaoAtiva: LocacaoAtivaDTO = {
  id: 'locacao-1',
  status: 'APROVADA',
  dataInicio: '2026-10-01T00:00:00.000Z',
  dataFim: '2026-10-03T00:00:00.000Z',
  valorTotal: 40,
  item: { id: 'item-1', titulo: 'Furadeira Bosch', ownerId: 'user-1' },
  locatario: { id: 'user-2', nome: 'Bruno Locatário' },
};

function mockApis(overrides: { moradores?: MoradorDTO[]; locacoes?: LocacaoAtivaDTO[] } = {}) {
  vi.spyOn(sindicoApi, 'buscarCondominio').mockResolvedValue(condominio);
  vi.spyOn(sindicoApi, 'listarMoradores').mockResolvedValue(overrides.moradores ?? [morador]);
  vi.spyOn(sindicoApi, 'listarLocacoesAtivas').mockResolvedValue(
    overrides.locacoes ?? [locacaoAtiva],
  );
}

describe('SindicoPage', () => {
  it('exibe os dados do condomínio e os moradores por padrão', async () => {
    mockApis();

    render(<SindicoPage />);

    expect(await screen.findByText('Residencial Jardim Europa')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
    expect(screen.getByText('Ana Proprietária')).toBeInTheDocument();
  });

  it('mostra as locações ativas ao trocar de aba', async () => {
    mockApis();

    render(<SindicoPage />);
    await screen.findByText('Ana Proprietária');

    await userEvent.click(screen.getByRole('button', { name: 'Locações ativas' }));

    expect(await screen.findByText('Furadeira Bosch')).toBeInTheDocument();
  });

  it('altera o PIN do condomínio', async () => {
    mockApis();
    vi.spyOn(sindicoApi, 'atualizarPin').mockResolvedValue({ ...condominio, pin: '5678' });

    render(<SindicoPage />);
    await screen.findByText('1234');

    await userEvent.click(screen.getByRole('button', { name: 'Alterar PIN' }));
    await userEvent.type(screen.getByLabelText('Novo PIN'), '5678');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(sindicoApi.atualizarPin).toHaveBeenCalledWith('5678');
    expect(await screen.findByText('5678')).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há moradores', async () => {
    mockApis({ moradores: [] });

    render(<SindicoPage />);

    expect(await screen.findByText('Nenhum morador cadastrado ainda')).toBeInTheDocument();
  });
});
