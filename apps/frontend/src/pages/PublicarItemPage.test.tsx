import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PublicarItemPage } from './PublicarItemPage';
import * as itensApi from '@/features/itens/itens.api';

function ItemDetalheStub() {
  const { id } = useParams<{ id: string }>();
  return <p>Detalhe do item {id}</p>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/itens/novo']}>
      <Routes>
        <Route path="/itens/novo" element={<PublicarItemPage />} />
        <Route path="/itens/:id" element={<ItemDetalheStub />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PublicarItemPage', () => {
  it('publica o item e navega pro detalhe recém-criado', async () => {
    vi.spyOn(itensApi, 'criarItem').mockResolvedValue({
      id: 'item-novo',
      titulo: 'Furadeira Bosch',
      descricao: 'Furadeira de impacto em ótimo estado',
      categoria: 'Ferramentas',
      valorDiaria: 20,
      ativo: true,
      ownerId: 'user-1',
      condominioId: 'cond-1',
      imagens: [],
      createdAt: '2026-09-15T00:00:00.000Z',
    });

    renderPage();

    await userEvent.type(screen.getByLabelText('Título'), 'Furadeira Bosch');
    await userEvent.type(screen.getByLabelText('Categoria'), 'Ferramentas');
    await userEvent.type(
      screen.getByLabelText('Descrição'),
      'Furadeira de impacto em ótimo estado',
    );
    await userEvent.type(screen.getByLabelText('Valor por diária (R$)'), '20');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(itensApi.criarItem).toHaveBeenCalledWith({
      titulo: 'Furadeira Bosch',
      categoria: 'Ferramentas',
      descricao: 'Furadeira de impacto em ótimo estado',
      valorDiaria: 20,
      imagens: undefined,
    });
    expect(await screen.findByText('Detalhe do item item-novo')).toBeInTheDocument();
  });

  it('exibe mensagem de erro quando a publicação falha', async () => {
    vi.spyOn(itensApi, 'criarItem').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'Dados inválidos' } } },
    });

    renderPage();

    await userEvent.type(screen.getByLabelText('Título'), 'Furadeira Bosch');
    await userEvent.type(screen.getByLabelText('Categoria'), 'Ferramentas');
    await userEvent.type(
      screen.getByLabelText('Descrição'),
      'Furadeira de impacto em ótimo estado',
    );
    await userEvent.type(screen.getByLabelText('Valor por diária (R$)'), '20');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Dados inválidos');
  });
});
