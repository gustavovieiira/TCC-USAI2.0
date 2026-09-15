import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PublicarItemForm } from './PublicarItemForm';
import * as itensApi from './itens.api';

const itemCriado = {
  id: 'item-1',
  titulo: 'Furadeira Bosch',
  descricao: 'Furadeira de impacto seminova',
  categoria: 'Ferramentas',
  valorDiaria: 20,
  ativo: true,
  ownerId: 'user-1',
  condominioId: 'cond-1',
  imagens: [],
  createdAt: '2026-09-15T00:00:00.000Z',
};

describe('PublicarItemForm', () => {
  it('publica o item e chama onSuccess com o resultado (RF06)', async () => {
    vi.spyOn(itensApi, 'criarItem').mockResolvedValue(itemCriado);
    const onSuccess = vi.fn();

    render(<PublicarItemForm onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText('Título'), 'Furadeira Bosch');
    await userEvent.type(screen.getByLabelText('Descrição'), 'Furadeira de impacto seminova');
    await userEvent.type(screen.getByLabelText('Valor por dia (R$)'), '20');
    await userEvent.click(screen.getByRole('button', { name: /publicar item/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(itemCriado));
    expect(itensApi.criarItem).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Furadeira Bosch', valorDiaria: 20 }),
    );
  });

  it('exibe mensagem de erro quando a publicação falha', async () => {
    vi.spyOn(itensApi, 'criarItem').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'Dados inválidos' } } },
    });

    render(<PublicarItemForm onSuccess={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Título'), 'Furadeira Bosch');
    await userEvent.type(screen.getByLabelText('Descrição'), 'Furadeira de impacto seminova');
    await userEvent.type(screen.getByLabelText('Valor por dia (R$)'), '20');
    await userEvent.click(screen.getByRole('button', { name: /publicar item/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
