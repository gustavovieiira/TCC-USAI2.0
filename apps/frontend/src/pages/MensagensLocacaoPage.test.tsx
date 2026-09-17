import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MensagensLocacaoPage } from './MensagensLocacaoPage';
import * as mensagensApi from '@/features/mensagens/mensagens.api';
import * as authStorage from '@/lib/authStorage';
import * as socketLib from '@/lib/socket';
import { MensagemDTO } from '@/features/mensagens/mensagens.types';

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

const historico: MensagemDTO[] = [
  {
    id: 'msg-1',
    locacaoId: 'locacao-1',
    remetenteId: 'user-dono',
    conteudo: 'Oi, tudo certo pra retirada?',
    createdAt: '2026-09-15T12:00:00.000Z',
  },
];

function renderPage(fakeSocket: ReturnType<typeof buildFakeSocket>) {
  vi.spyOn(socketLib, 'createLocacaoSocket').mockReturnValue(
    fakeSocket as unknown as socketLib.LocacaoSocket,
  );
  vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
    id: 'user-locatario',
    nome: 'Bruno',
    email: 'bruno@example.com',
    papel: 'MORADOR',
    condominioId: 'cond-1',
    apartamento: null,
  });

  return render(
    <MemoryRouter initialEntries={['/locacoes/locacao-1/mensagens']}>
      <Routes>
        <Route path="/locacoes/:id/mensagens" element={<MensagensLocacaoPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MensagensLocacaoPage', () => {
  it('carrega o histórico e entra na sala da locação ao conectar', async () => {
    vi.spyOn(mensagensApi, 'listarMensagens').mockResolvedValue(historico);
    const fakeSocket = buildFakeSocket();

    renderPage(fakeSocket);

    expect(await screen.findByText('Oi, tudo certo pra retirada?')).toBeInTheDocument();

    fakeSocket.trigger('connect');
    expect(fakeSocket.emit).toHaveBeenCalledWith(
      'locacao:entrar',
      'locacao-1',
      expect.any(Function),
    );

    fakeSocket.respondTo('locacao:entrar', true);
    expect(await screen.findByText('Conectado')).toBeInTheDocument();
  });

  it('mostra erro quando o usuário não participa da locação', async () => {
    vi.spyOn(mensagensApi, 'listarMensagens').mockResolvedValue([]);
    const fakeSocket = buildFakeSocket();

    renderPage(fakeSocket);
    fakeSocket.trigger('connect');
    fakeSocket.respondTo('locacao:entrar', false);

    expect(await screen.findByRole('alert')).toHaveTextContent('não participa desta locação');
  });

  it('recebe mensagem em tempo real via WebSocket', async () => {
    vi.spyOn(mensagensApi, 'listarMensagens').mockResolvedValue(historico);
    const fakeSocket = buildFakeSocket();

    renderPage(fakeSocket);
    await screen.findByText('Oi, tudo certo pra retirada?');

    fakeSocket.trigger('mensagem:nova', {
      id: 'msg-2',
      locacaoId: 'locacao-1',
      remetenteId: 'user-dono',
      conteudo: 'Combinado, te espero às 18h',
      createdAt: '2026-09-15T12:05:00.000Z',
    });

    expect(await screen.findByText('Combinado, te espero às 18h')).toBeInTheDocument();
  });

  it('envia mensagem pelo formulário e limpa o campo no sucesso', async () => {
    vi.spyOn(mensagensApi, 'listarMensagens').mockResolvedValue([]);
    const fakeSocket = buildFakeSocket();

    renderPage(fakeSocket);
    fakeSocket.trigger('connect');
    fakeSocket.respondTo('locacao:entrar', true);
    await screen.findByText('Conectado');

    const campo = screen.getByPlaceholderText('Escreva uma mensagem...');
    await userEvent.type(campo, 'Chega às 18h?');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(fakeSocket.emit).toHaveBeenCalledWith(
      'mensagem:enviar',
      { locacaoId: 'locacao-1', conteudo: 'Chega às 18h?' },
      expect.any(Function),
    );

    fakeSocket.respondTo('mensagem:enviar', {
      ok: true,
      mensagem: {
        id: 'msg-3',
        locacaoId: 'locacao-1',
        remetenteId: 'user-locatario',
        conteudo: 'Chega às 18h?',
        createdAt: '2026-09-15T12:10:00.000Z',
      },
    });

    await waitFor(() => expect(campo).toHaveValue(''));
  });

  it('desconecta o socket ao desmontar', async () => {
    vi.spyOn(mensagensApi, 'listarMensagens').mockResolvedValue([]);
    const fakeSocket = buildFakeSocket();

    const { unmount } = renderPage(fakeSocket);
    await screen.findByText('Nenhuma mensagem ainda. Diga oi 👋');

    unmount();

    expect(fakeSocket.disconnect).toHaveBeenCalled();
  });
});
