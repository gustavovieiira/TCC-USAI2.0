import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RoleRoute } from './RoleRoute';
import * as authStorage from '@/lib/authStorage';

function renderComPapel(allow: authStorage.Papel[]) {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/dashboard" element={<p>Dashboard</p>} />
        <Route element={<RoleRoute allow={allow} />}>
          <Route path="/admin" element={<p>Painel restrito</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('RoleRoute', () => {
  it('libera o acesso quando o papel do usuário está na lista permitida', () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-1',
      nome: 'Admin',
      email: 'admin@example.com',
      papel: 'ADMIN',
      condominioId: null,
    });

    renderComPapel(['ADMIN']);

    expect(screen.getByText('Painel restrito')).toBeInTheDocument();
  });

  it('redireciona pro dashboard quando o papel não está na lista permitida', () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-2',
      nome: 'Bruno',
      email: 'bruno@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
    });

    renderComPapel(['ADMIN']);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Painel restrito')).not.toBeInTheDocument();
  });

  it('redireciona quando não há usuário logado', () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue(null);

    renderComPapel(['ADMIN']);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
