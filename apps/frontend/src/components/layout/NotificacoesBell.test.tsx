import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NotificacoesBell } from './NotificacoesBell';
import { NotificacoesContext } from '@/features/notificacoes/useNotificacoes';

function renderBell(naoLidas: number) {
  render(
    <NotificacoesContext.Provider
      value={{
        notificacoes: [],
        naoLidas,
        ultimaRecebida: null,
        toast: null,
        marcarComoLida: vi.fn(),
        marcarTodasComoLidas: vi.fn(),
        fecharToast: vi.fn(),
      }}
    >
      <MemoryRouter>
        <NotificacoesBell />
      </MemoryRouter>
    </NotificacoesContext.Provider>,
  );
}

describe('NotificacoesBell', () => {
  it('aponta pra página de notificações', () => {
    renderBell(0);

    expect(screen.getByRole('link', { name: 'Notificações' })).toHaveAttribute(
      'href',
      '/notificacoes',
    );
  });

  it('sem não lidas não mostra a bolinha de contagem', () => {
    renderBell(0);

    expect(screen.queryByTestId('notificacoes-contagem')).not.toBeInTheDocument();
  });

  it('mostra a contagem de não lidas e a descreve pra leitores de tela', () => {
    renderBell(3);

    expect(screen.getByTestId('notificacoes-contagem')).toHaveTextContent('3');
    expect(screen.getByRole('link', { name: 'Notificações (3 não lidas)' })).toBeInTheDocument();
  });

  it('usa o singular com uma só não lida e 99+ quando passa de 99', () => {
    renderBell(1);
    expect(screen.getByRole('link', { name: 'Notificações (1 não lida)' })).toBeInTheDocument();
  });

  it('limita a bolinha a 99+', () => {
    renderBell(150);

    expect(screen.getByTestId('notificacoes-contagem')).toHaveTextContent('99+');
  });
});
