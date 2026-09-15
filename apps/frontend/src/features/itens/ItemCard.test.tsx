import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ItemCard } from './ItemCard';
import { ItemDTO } from './itens.types';

const itemBase: ItemDTO = {
  id: 'item-1',
  titulo: 'Furadeira Bosch',
  descricao: 'Furadeira de impacto em ótimo estado',
  categoria: 'Ferramentas',
  valorDiaria: 20,
  ativo: true,
  ownerId: 'user-1',
  condominioId: 'cond-1',
  imagens: [],
  createdAt: '2026-09-15T00:00:00.000Z',
};

describe('ItemCard', () => {
  it('exibe título, categoria e valor formatado, linkando pro detalhe do item', () => {
    render(
      <MemoryRouter>
        <ItemCard item={itemBase} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Furadeira Bosch')).toBeInTheDocument();
    expect(screen.getByText('Ferramentas')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?20/)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/itens/item-1');
  });

  it('mostra um placeholder quando o item não tem foto', () => {
    render(
      <MemoryRouter>
        <ItemCard item={itemBase} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('mostra a foto quando o item tem imagem cadastrada', () => {
    render(
      <MemoryRouter>
        <ItemCard item={{ ...itemBase, imagens: ['https://cdn.example.com/foto.jpg'] }} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://cdn.example.com/foto.jpg');
  });
});
