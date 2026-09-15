import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MinhasLocacoesPage } from './MinhasLocacoesPage';
import * as locacoesApi from '@/features/locacoes/locacoes.api';
import { LocacaoDTO } from '@/features/locacoes/locacoes.types';

function buildLocacao(overrides: Partial<LocacaoDTO> = {}): LocacaoDTO {
  return {
    id: 'locacao-1',
    itemId: 'item-1',
    locatarioId: 'user-2',
    dataInicio: '2026-10-01T00:00:00.000Z',
    dataFim: '2026-10-03T00:00:00.000Z',
    valorTotal: 40,
    status: 'PENDENTE',
    createdAt: '2026-09-15T00:00:00.000Z',
    item: { id: 'item-1', titulo: 'Furadeira Bosch', valorDiaria: 20, ownerId: 'user-1' },
    ...overrides,
  };
}

describe('MinhasLocacoesPage', () => {
  it('mostra as locações como locatário por padrão', async () => {
    vi.spyOn(locacoesApi, 'listarComoLocatario').mockResolvedValue([buildLocacao()]);
    vi.spyOn(locacoesApi, 'listarComoProprietario').mockResolvedValue([]);

    render(<MinhasLocacoesPage />);

    expect(await screen.findByText('Furadeira Bosch')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument();
  });

  it('mostra aprovar/rejeitar para locações pendentes recebidas', async () => {
    vi.spyOn(locacoesApi, 'listarComoLocatario').mockResolvedValue([]);
    vi.spyOn(locacoesApi, 'listarComoProprietario').mockResolvedValue([buildLocacao()]);

    render(<MinhasLocacoesPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Recebidas' }));

    expect(await screen.findByText('Furadeira Bosch')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rejeitar' })).toBeInTheDocument();
  });

  it('aprova a locação e atualiza o status na tela', async () => {
    vi.spyOn(locacoesApi, 'listarComoLocatario').mockResolvedValue([]);
    vi.spyOn(locacoesApi, 'listarComoProprietario').mockResolvedValue([buildLocacao()]);
    vi.spyOn(locacoesApi, 'aprovarLocacao').mockResolvedValue(buildLocacao({ status: 'APROVADA' }));

    render(<MinhasLocacoesPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Recebidas' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Aprovar' }));

    expect(await screen.findByText('Aprovada')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument(),
    );
  });

  it('não mostra ações de aprovação para locações que não estão pendentes', async () => {
    vi.spyOn(locacoesApi, 'listarComoLocatario').mockResolvedValue([]);
    vi.spyOn(locacoesApi, 'listarComoProprietario').mockResolvedValue([
      buildLocacao({ status: 'CANCELADA' }),
    ]);

    render(<MinhasLocacoesPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Recebidas' }));

    await screen.findByText('Cancelada');
    expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument();
  });
});
