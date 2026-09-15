import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';
import * as authStorage from '@/lib/authStorage';

describe('DashboardPage', () => {
  it('cumprimenta o morador pelo primeiro nome', () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-1',
      nome: 'Ana Proprietaria',
      email: 'ana@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Olá, Ana 👋')).toBeInTheDocument();
  });

  it('mostra os atalhos pro catálogo, publicar item e minhas locações', () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue(null);

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Catálogo/ })).toHaveAttribute('href', '/catalogo');
    expect(screen.getByRole('link', { name: /Publicar item/ })).toHaveAttribute(
      'href',
      '/itens/novo',
    );
    expect(screen.getByRole('link', { name: /Minhas locações/ })).toHaveAttribute(
      'href',
      '/locacoes',
    );
  });
});
