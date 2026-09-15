import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SolicitarLocacaoForm } from './SolicitarLocacaoForm';
import * as locacoesApi from './locacoes.api';

const locacaoCriada = {
  id: 'locacao-1',
  itemId: 'item-1',
  locatarioId: 'user-2',
  dataInicio: '2026-10-01T00:00:00.000Z',
  dataFim: '2026-10-03T00:00:00.000Z',
  valorTotal: 40,
  status: 'PENDENTE' as const,
  createdAt: '2026-09-15T00:00:00.000Z',
  item: { id: 'item-1', titulo: 'Furadeira Bosch', valorDiaria: 20, ownerId: 'user-1' },
};

describe('SolicitarLocacaoForm', () => {
  it('calcula o valor total a partir do período informado (RF11)', async () => {
    render(
      <SolicitarLocacaoForm
        itemId="item-1"
        valorDiaria={20}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText('Data de início'), '2026-10-01');
    await userEvent.type(screen.getByLabelText('Data de fim'), '2026-10-03');

    expect(await screen.findByText(/R\$ 40.00/)).toBeInTheDocument();
  });

  it('envia a solicitação e chama onSuccess (RF10)', async () => {
    vi.spyOn(locacoesApi, 'solicitarLocacao').mockResolvedValue(locacaoCriada);
    const onSuccess = vi.fn();

    render(
      <SolicitarLocacaoForm
        itemId="item-1"
        valorDiaria={20}
        onSuccess={onSuccess}
        onCancel={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText('Data de início'), '2026-10-01');
    await userEvent.type(screen.getByLabelText('Data de fim'), '2026-10-03');
    await userEvent.click(screen.getByRole('button', { name: /confirmar solicitação/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(locacaoCriada));
  });

  it('chama onCancel ao clicar em cancelar', async () => {
    const onCancel = vi.fn();
    render(
      <SolicitarLocacaoForm
        itemId="item-1"
        valorDiaria={20}
        onSuccess={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(onCancel).toHaveBeenCalled();
  });
});
