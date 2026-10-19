import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NotificacoesPage } from './NotificacoesPage';
import { NotificacaoDTO } from '@/features/notificacoes/notificacoes.types';
import { NotificacoesContext, NotificacoesEstado } from '@/features/notificacoes/useNotificacoes';

function buildNotificacao(overrides: Partial<NotificacaoDTO> = {}): NotificacaoDTO {
  return {
    id: 'n-1',
    tipo: 'SAQUE_APROVADO',
    titulo: 'Saque aprovado',
    mensagem: 'Seu saque de R$ 45,00 foi aprovado.',
    link: '/saques',
    lida: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderPage(estado: Partial<NotificacoesEstado>) {
  const completo: NotificacoesEstado = {
    notificacoes: [],
    naoLidas: 0,
    ultimaRecebida: null,
    toast: null,
    marcarComoLida: vi.fn(),
    marcarTodasComoLidas: vi.fn(),
    fecharToast: vi.fn(),
    ...estado,
  };

  render(
    <NotificacoesContext.Provider value={completo}>
      <MemoryRouter initialEntries={['/notificacoes']}>
        <Routes>
          <Route path="/notificacoes" element={<NotificacoesPage />} />
          <Route path="/saques" element={<p>Página de saques</p>} />
        </Routes>
      </MemoryRouter>
    </NotificacoesContext.Provider>,
  );

  return completo;
}

describe('NotificacoesPage', () => {
  it('lista as notificações com título e mensagem', () => {
    renderPage({ notificacoes: [buildNotificacao()], naoLidas: 1 });

    expect(screen.getByText('Saque aprovado')).toBeInTheDocument();
    expect(screen.getByText('Seu saque de R$ 45,00 foi aprovado.')).toBeInTheDocument();
    expect(screen.getByLabelText('Não lida')).toBeInTheDocument();
  });

  it('não marca como não lida uma notificação já lida', () => {
    renderPage({ notificacoes: [buildNotificacao({ lida: true })], naoLidas: 0 });

    expect(screen.queryByLabelText('Não lida')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Marcar todas como lidas' }),
    ).not.toBeInTheDocument();
  });

  it('mostra estado vazio quando não há notificações', () => {
    renderPage({ notificacoes: [] });

    expect(screen.getByText('Nenhuma notificação ainda')).toBeInTheDocument();
  });

  it('clicar marca como lida e leva pra tela do assunto', async () => {
    const estado = renderPage({ notificacoes: [buildNotificacao()], naoLidas: 1 });

    await userEvent.click(screen.getByRole('button', { name: /Saque aprovado/ }));

    expect(estado.marcarComoLida).toHaveBeenCalledWith('n-1');
    expect(await screen.findByText('Página de saques')).toBeInTheDocument();
  });

  it('"Marcar todas como lidas" chama a ação do contexto', async () => {
    const estado = renderPage({
      notificacoes: [buildNotificacao(), buildNotificacao({ id: 'n-2' })],
      naoLidas: 2,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Marcar todas como lidas' }));

    expect(estado.marcarTodasComoLidas).toHaveBeenCalled();
  });
});
