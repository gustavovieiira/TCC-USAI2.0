import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CatalogoPage } from './CatalogoPage';
import * as itensApi from '@/features/itens/itens.api';
import { ItemDTO } from '@/features/itens/itens.types';

const itens: ItemDTO[] = [
  {
    id: 'item-1',
    titulo: 'Furadeira Bosch',
    descricao: 'Furadeira de impacto',
    categoria: 'Ferramentas',
    valorDiaria: 20,
    ativo: true,
    ownerId: 'user-1',
    condominioId: 'cond-1',
    imagens: [],
    createdAt: '2026-09-15T00:00:00.000Z',
  },
  {
    id: 'item-2',
    titulo: 'Jogo de taças',
    descricao: 'Taças de cristal pra 12 pessoas',
    categoria: 'Cozinha',
    valorDiaria: 10,
    ativo: true,
    ownerId: 'user-2',
    condominioId: 'cond-1',
    imagens: [],
    createdAt: '2026-09-15T00:00:00.000Z',
  },
];

describe('CatalogoPage', () => {
  it('lista os itens do condomínio', async () => {
    vi.spyOn(itensApi, 'listarItens').mockResolvedValue(itens);

    render(
      <MemoryRouter>
        <CatalogoPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Furadeira Bosch')).toBeInTheDocument();
    expect(screen.getByText('Jogo de taças')).toBeInTheDocument();
  });

  it('filtra por categoria ao clicar num chip', async () => {
    vi.spyOn(itensApi, 'listarItens').mockResolvedValue(itens);

    render(
      <MemoryRouter>
        <CatalogoPage />
      </MemoryRouter>,
    );

    await screen.findByText('Furadeira Bosch');
    await userEvent.click(screen.getByRole('button', { name: 'Cozinha' }));

    expect(screen.queryByText('Furadeira Bosch')).not.toBeInTheDocument();
    expect(screen.getByText('Jogo de taças')).toBeInTheDocument();
  });

  it('filtra pela busca de texto', async () => {
    vi.spyOn(itensApi, 'listarItens').mockResolvedValue(itens);

    render(
      <MemoryRouter>
        <CatalogoPage />
      </MemoryRouter>,
    );

    await screen.findByText('Furadeira Bosch');
    await userEvent.type(screen.getByPlaceholderText('Buscar item, categoria, vizinho…'), 'taças');

    await waitFor(() => expect(screen.queryByText('Furadeira Bosch')).not.toBeInTheDocument());
    expect(screen.getByText('Jogo de taças')).toBeInTheDocument();
  });

  it('mostra estado vazio quando o condomínio ainda não tem itens', async () => {
    vi.spyOn(itensApi, 'listarItens').mockResolvedValue([]);

    render(
      <MemoryRouter>
        <CatalogoPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Ainda não há itens no catálogo')).toBeInTheDocument();
  });
});
