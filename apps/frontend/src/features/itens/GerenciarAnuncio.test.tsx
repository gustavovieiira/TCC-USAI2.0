import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GerenciarAnuncio } from './GerenciarAnuncio';
import * as itensApi from './itens.api';
import { ItemDTO } from './itens.types';

const item: ItemDTO = {
  id: 'item-1',
  titulo: 'Furadeira Bosch',
  descricao: 'Furadeira de impacto em ótimo estado',
  categoria: 'Ferramentas',
  valorDiaria: 20,
  ativo: true,
  ownerId: 'user-dono',
  condominioId: 'cond-1',
  imagens: [],
  createdAt: '2026-09-15T00:00:00.000Z',
};

function renderar(aoAtualizar = vi.fn(), aoRemover = vi.fn()) {
  render(
    <MemoryRouter>
      <GerenciarAnuncio item={item} aoAtualizar={aoAtualizar} aoRemover={aoRemover} />
    </MemoryRouter>,
  );
  return { aoAtualizar, aoRemover };
}

describe('GerenciarAnuncio', () => {
  afterEach(() => vi.restoreAllMocks());

  it('edita o anúncio e avisa a página com o item atualizado', async () => {
    const atualizado = { ...item, valorDiaria: 35 };
    const spy = vi.spyOn(itensApi, 'atualizarItem').mockResolvedValue(atualizado);
    const { aoAtualizar } = renderar();

    await userEvent.click(screen.getByRole('button', { name: 'Editar anúncio' }));
    const valor = screen.getByLabelText('Valor por diária (R$)');
    await userEvent.clear(valor);
    await userEvent.type(valor, '35');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(spy).toHaveBeenCalledWith('item-1', {
      titulo: 'Furadeira Bosch',
      categoria: 'Ferramentas',
      descricao: 'Furadeira de impacto em ótimo estado',
      valorDiaria: 35,
    });
    expect(aoAtualizar).toHaveBeenCalledWith(atualizado);
    expect(await screen.findByText('Anúncio atualizado.')).toBeInTheDocument();
  });

  it('recusa diária abaixo do mínimo sem chamar o servidor', async () => {
    const spy = vi.spyOn(itensApi, 'atualizarItem');
    renderar();

    await userEvent.click(screen.getByRole('button', { name: 'Editar anúncio' }));
    const valor = screen.getByLabelText('Valor por diária (R$)');
    await userEvent.clear(valor);
    await userEvent.type(valor, '2');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/mínimo da diária é R\$ 5,00/);
    expect(spy).not.toHaveBeenCalled();
  });

  it('recusa título curto demais', async () => {
    const spy = vi.spyOn(itensApi, 'atualizarItem');
    renderar();

    await userEvent.click(screen.getByRole('button', { name: 'Editar anúncio' }));
    const titulo = screen.getByLabelText('Título');
    await userEvent.clear(titulo);
    await userEvent.type(titulo, 'ab');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/Confira o título/);
    expect(spy).not.toHaveBeenCalled();
  });

  it('cancelar a edição volta ao estado inicial sem salvar', async () => {
    const spy = vi.spyOn(itensApi, 'atualizarItem');
    renderar();

    await userEvent.click(screen.getByRole('button', { name: 'Editar anúncio' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('button', { name: 'Editar anúncio' })).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it('remove só depois de confirmar na janela', async () => {
    const spy = vi.spyOn(itensApi, 'removerItem').mockResolvedValue();
    const { aoRemover } = renderar();

    await userEvent.click(screen.getByRole('button', { name: 'Remover do catálogo' }));
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveTextContent(/continuam no histórico/);

    await userEvent.click(screen.getByRole('button', { name: 'Sim, remover' }));

    expect(spy).toHaveBeenCalledWith('item-1');
    expect(aoRemover).toHaveBeenCalled();
  });

  it('"Manter no catálogo" fecha a janela sem remover', async () => {
    const spy = vi.spyOn(itensApi, 'removerItem');
    renderar();

    await userEvent.click(screen.getByRole('button', { name: 'Remover do catálogo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Manter no catálogo' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it('mostra o erro do servidor quando a remoção falha', async () => {
    vi.spyOn(itensApi, 'removerItem').mockRejectedValue(new Error('Falha de rede'));
    const { aoRemover } = renderar();

    await userEvent.click(screen.getByRole('button', { name: 'Remover do catálogo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sim, remover' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(aoRemover).not.toHaveBeenCalled();
  });
});
