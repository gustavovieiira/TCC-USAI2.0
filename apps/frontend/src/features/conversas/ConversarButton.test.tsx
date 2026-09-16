import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ConversarButton } from './ConversarButton';
import * as conversasApi from './conversas.api';
import { ConversaDTO } from './conversas.types';

const conversa: ConversaDTO = {
  id: 'conversa-1',
  outroParticipante: { id: 'user-bruno', nome: 'Bruno Locatario', papel: 'MORADOR' },
  postOrigemId: 'post-1',
  createdAt: '2026-09-16T12:00:00.000Z',
  expiraEm: '2026-09-23T12:00:00.000Z',
  ultimaMensagem: null,
};

function renderButton(props: Partial<React.ComponentProps<typeof ConversarButton>> = {}) {
  return render(
    <MemoryRouter initialEntries={['/mural']}>
      <Routes>
        <Route
          path="/mural"
          element={
            <ConversarButton
              usuarioId="user-bruno"
              nomeDoOutro="Bruno Locatario"
              postOrigemId="post-1"
              {...props}
            />
          }
        />
        <Route path="/conversas/:id" element={<p>Tela da conversa {conversa.id}</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ConversarButton', () => {
  it('abre a conversa e navega pra tela dela ao clicar', async () => {
    const abrir = vi.spyOn(conversasApi, 'abrirConversa').mockResolvedValue(conversa);

    renderButton();
    await userEvent.click(screen.getByRole('button', { name: 'Conversar com Bruno Locatario' }));

    expect(abrir).toHaveBeenCalledWith({ usuarioId: 'user-bruno', postOrigemId: 'post-1' });
    expect(await screen.findByText('Tela da conversa conversa-1')).toBeInTheDocument();
  });

  it('mostra o texto "Conversar" na variante text', () => {
    renderButton({ variant: 'text' });

    expect(screen.getByRole('button', { name: 'Conversar com Bruno Locatario' })).toHaveTextContent(
      'Conversar',
    );
  });

  it('exibe erro quando não consegue abrir a conversa', async () => {
    vi.spyOn(conversasApi, 'abrirConversa').mockRejectedValue({
      isAxiosError: true,
      response: {
        data: { error: { message: 'Você não pode iniciar uma conversa com você mesmo' } },
      },
    });

    renderButton();
    await userEvent.click(screen.getByRole('button', { name: 'Conversar com Bruno Locatario' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Você não pode iniciar uma conversa com você mesmo',
    );
  });
});
