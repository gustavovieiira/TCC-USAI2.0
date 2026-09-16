import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ConversaPage } from './ConversaPage';
import * as conversasApi from '@/features/conversas/conversas.api';
import * as authStorage from '@/lib/authStorage';
import * as socketLib from '@/lib/socket';
import { formatDiasRestantes } from '@/lib/format';
import { ConversaDTO, MensagemPrivadaDTO } from '@/features/conversas/conversas.types';

const EXPIRA_EM = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

type Handler = (...args: unknown[]) => void;

function buildFakeSocket() {
  const handlers: Record<string, Handler[]> = {};
  const emitCallbacks: Record<string, Handler> = {};

  return {
    on: vi.fn((event: string, cb: Handler) => {
      (handlers[event] ??= []).push(cb);
    }),
    emit: vi.fn((event: string, ...args: unknown[]) => {
      const callback = args[args.length - 1];
      if (typeof callback === 'function') {
        emitCallbacks[event] = callback as Handler;
      }
    }),
    disconnect: vi.fn(),
    trigger(event: string, ...args: unknown[]) {
      handlers[event]?.forEach((cb) => cb(...args));
    },
    respondTo(event: string, ...args: unknown[]) {
      emitCallbacks[event]?.(...args);
    },
  };
}

const conversaBase: ConversaDTO = {
  id: 'conversa-1',
  outroParticipante: { id: 'user-bruno', nome: 'Bruno Locatario', papel: 'MORADOR' },
  postOrigemId: 'post-1',
  createdAt: '2026-09-16T12:00:00.000Z',
  expiraEm: EXPIRA_EM,
  ultimaMensagem: null,
};

const historico: MensagemPrivadaDTO[] = [
  {
    id: 'msg-1',
    conversaId: 'conversa-1',
    remetenteId: 'user-bruno',
    conteudo: 'Ainda tem a furadeira?',
    createdAt: '2026-09-16T12:05:00.000Z',
  },
];

function renderPage(fakeSocket: ReturnType<typeof buildFakeSocket>) {
  vi.spyOn(socketLib, 'createConversaSocket').mockReturnValue(
    fakeSocket as unknown as socketLib.ConversaSocket,
  );
  vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
    id: 'user-ana',
    nome: 'Ana Proprietaria',
    email: 'ana@example.com',
    papel: 'MORADOR',
    condominioId: 'cond-1',
  });

  return render(
    <MemoryRouter initialEntries={['/conversas/conversa-1']}>
      <Routes>
        <Route path="/conversas/:id" element={<ConversaPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ConversaPage', () => {
  it('carrega os dados da conversa e o histórico, entrando na sala ao conectar', async () => {
    vi.spyOn(conversasApi, 'buscarConversa').mockResolvedValue(conversaBase);
    vi.spyOn(conversasApi, 'listarMensagens').mockResolvedValue(historico);
    const fakeSocket = buildFakeSocket();

    renderPage(fakeSocket);

    expect(await screen.findByText('Bruno Locatario')).toBeInTheDocument();
    expect(await screen.findByText('Ainda tem a furadeira?')).toBeInTheDocument();
    expect(await screen.findByText(new RegExp(formatDiasRestantes(EXPIRA_EM)))).toBeInTheDocument();

    fakeSocket.trigger('connect');
    expect(fakeSocket.emit).toHaveBeenCalledWith(
      'conversa:entrar',
      'conversa-1',
      expect.any(Function),
    );

    fakeSocket.respondTo('conversa:entrar', true);
    expect(await screen.findByText(/Conectado/)).toBeInTheDocument();
  });

  it('mostra erro quando a conversa não está mais disponível', async () => {
    vi.spyOn(conversasApi, 'buscarConversa').mockResolvedValue(conversaBase);
    vi.spyOn(conversasApi, 'listarMensagens').mockResolvedValue([]);
    const fakeSocket = buildFakeSocket();

    renderPage(fakeSocket);
    fakeSocket.trigger('connect');
    fakeSocket.respondTo('conversa:entrar', false);

    expect(await screen.findByRole('alert')).toHaveTextContent('não está mais disponível');
  });

  it('recebe mensagem em tempo real via WebSocket', async () => {
    vi.spyOn(conversasApi, 'buscarConversa').mockResolvedValue(conversaBase);
    vi.spyOn(conversasApi, 'listarMensagens').mockResolvedValue(historico);
    const fakeSocket = buildFakeSocket();

    renderPage(fakeSocket);
    await screen.findByText('Ainda tem a furadeira?');

    fakeSocket.trigger('conversa:mensagem:nova', {
      id: 'msg-2',
      conversaId: 'conversa-1',
      remetenteId: 'user-ana',
      conteudo: 'Tenho sim, posso levar amanhã',
      createdAt: '2026-09-16T12:10:00.000Z',
    });

    expect(await screen.findByText('Tenho sim, posso levar amanhã')).toBeInTheDocument();
  });

  it('envia mensagem pelo formulário e limpa o campo no sucesso', async () => {
    vi.spyOn(conversasApi, 'buscarConversa').mockResolvedValue(conversaBase);
    vi.spyOn(conversasApi, 'listarMensagens').mockResolvedValue([]);
    const fakeSocket = buildFakeSocket();

    renderPage(fakeSocket);
    fakeSocket.trigger('connect');
    fakeSocket.respondTo('conversa:entrar', true);
    await screen.findByText(/Conectado/);

    const campo = screen.getByPlaceholderText('Escreva uma mensagem...');
    await userEvent.type(campo, 'Pode ser às 18h?');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(fakeSocket.emit).toHaveBeenCalledWith(
      'conversa:mensagem:enviar',
      { conversaId: 'conversa-1', conteudo: 'Pode ser às 18h?' },
      expect.any(Function),
    );

    fakeSocket.respondTo('conversa:mensagem:enviar', {
      ok: true,
      mensagem: {
        id: 'msg-3',
        conversaId: 'conversa-1',
        remetenteId: 'user-ana',
        conteudo: 'Pode ser às 18h?',
        createdAt: '2026-09-16T12:15:00.000Z',
      },
    });

    await waitFor(() => expect(campo).toHaveValue(''));
  });

  it('desconecta o socket ao desmontar', async () => {
    vi.spyOn(conversasApi, 'buscarConversa').mockResolvedValue(conversaBase);
    vi.spyOn(conversasApi, 'listarMensagens').mockResolvedValue([]);
    const fakeSocket = buildFakeSocket();

    const { unmount } = renderPage(fakeSocket);
    await screen.findByText('Nenhuma mensagem ainda. Diga oi 👋');

    unmount();

    expect(fakeSocket.disconnect).toHaveBeenCalled();
  });
});
