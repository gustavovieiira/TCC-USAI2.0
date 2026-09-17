import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';
import * as authStorage from '@/lib/authStorage';

function renderShell(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/catalogo" element={<p>Página do catálogo</p>} />
          <Route path="/locacoes" element={<p>Página de locações</p>} />
          <Route path="/perfil" element={<p>Página de perfil</p>} />
        </Route>
        <Route path="/login" element={<p>Página de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppShell', () => {
  it('renderiza o nome do morador logado e o conteúdo da rota', () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-1',
      nome: 'Bruno Locatario',
      email: 'bruno@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
      apartamento: null,
    });

    renderShell('/catalogo');

    expect(screen.getByText('Bruno Locatario')).toBeInTheDocument();
    expect(screen.getByText('Página do catálogo')).toBeInTheDocument();
    // duas navs (topo desktop + barra inferior mobile), cada uma com os 3 destinos
    expect(screen.getAllByRole('link', { name: 'Catálogo' })).toHaveLength(2);
  });

  it('leva pra página de perfil ao clicar no chip da conta no header', async () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-sindico',
      nome: 'Carla Síndica',
      email: 'carla@example.com',
      papel: 'SINDICO',
      condominioId: 'cond-1',
      apartamento: null,
    });

    renderShell('/catalogo');

    await userEvent.click(screen.getByRole('link', { name: /Carla Síndica/ }));

    expect(await screen.findByText('Página de perfil')).toBeInTheDocument();
  });
});
