import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as api from './notificacoes.api';
import { NotificacaoDTO } from './notificacoes.types';
import { useNotificacoes } from './useNotificacoes';
import * as authStorage from '@/lib/authStorage';
import * as socketLib from '@/lib/socket';

type Handler = (...args: unknown[]) => void;

function buildFakeSocket() {
  const handlers: Record<string, Handler[]> = {};
  return {
    on: vi.fn((event: string, cb: Handler) => {
      (handlers[event] ??= []).push(cb);
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
    trigger(event: string, ...args: unknown[]) {
      handlers[event]?.forEach((cb) => cb(...args));
    },
  };
}

function buildNotificacao(overrides: Partial<NotificacaoDTO> = {}): NotificacaoDTO {
  return {
    id: 'n-1',
    tipo: 'LOCACAO_APROVADA',
    titulo: 'Seu pedido foi aprovado',
    mensagem: 'Pague o PIX',
    link: '/locacoes',
    lida: false,
    createdAt: '2026-10-19T12:00:00.000Z',
    ...overrides,
  };
}

function prepararAmbiente(socket: ReturnType<typeof buildFakeSocket>) {
  vi.spyOn(socketLib, 'createConversaSocket').mockReturnValue(
    socket as unknown as socketLib.ConversaSocket,
  );
  vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
    id: 'user-1',
    nome: 'Ana Proprietaria',
    email: 'ana@example.com',
    papel: 'MORADOR',
    condominioId: 'cond-1',
    apartamento: null,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useNotificacoes', () => {
  it('carrega as notificações e a contagem de não lidas', async () => {
    prepararAmbiente(buildFakeSocket());
    vi.spyOn(api, 'listarNotificacoes').mockResolvedValue({
      notificacoes: [buildNotificacao(), buildNotificacao({ id: 'n-2', lida: true })],
      naoLidas: 1,
    });

    const { result } = renderHook(() => useNotificacoes(true));

    await waitFor(() => expect(result.current.notificacoes).toHaveLength(2));
    expect(result.current.naoLidas).toBe(1);
  });

  it('não conecta nem carrega quando está inativo', () => {
    const socket = buildFakeSocket();
    prepararAmbiente(socket);
    const listar = vi.spyOn(api, 'listarNotificacoes');

    renderHook(() => useNotificacoes(false));

    expect(listar).not.toHaveBeenCalled();
    expect(socketLib.createConversaSocket).not.toHaveBeenCalled();
  });

  it('notificação ao vivo entra no topo, soma na contagem e abre o toast', async () => {
    const socket = buildFakeSocket();
    prepararAmbiente(socket);
    vi.spyOn(api, 'listarNotificacoes').mockResolvedValue({
      notificacoes: [buildNotificacao({ id: 'antiga', lida: true })],
      naoLidas: 0,
    });

    const { result } = renderHook(() => useNotificacoes(true));
    await waitFor(() => expect(result.current.notificacoes).toHaveLength(1));

    act(() =>
      socket.trigger('notificacao:nova', buildNotificacao({ id: 'nova', titulo: 'Novo!' })),
    );

    expect(result.current.notificacoes?.map((n) => n.id)).toEqual(['nova', 'antiga']);
    expect(result.current.naoLidas).toBe(1);
    expect(result.current.toast?.titulo).toBe('Novo!');
    expect(result.current.ultimaRecebida?.id).toBe('nova');
  });

  it('marcar como lida atualiza na hora e avisa o servidor (só uma vez)', async () => {
    prepararAmbiente(buildFakeSocket());
    vi.spyOn(api, 'listarNotificacoes').mockResolvedValue({
      notificacoes: [buildNotificacao()],
      naoLidas: 1,
    });
    const marcar = vi.spyOn(api, 'marcarNotificacaoComoLida').mockResolvedValue(undefined);

    const { result } = renderHook(() => useNotificacoes(true));
    await waitFor(() => expect(result.current.naoLidas).toBe(1));

    act(() => result.current.marcarComoLida('n-1'));
    act(() => result.current.marcarComoLida('n-1'));

    expect(result.current.naoLidas).toBe(0);
    expect(result.current.notificacoes?.[0].lida).toBe(true);
    expect(marcar).toHaveBeenCalledTimes(1);
    expect(marcar).toHaveBeenCalledWith('n-1');
  });

  it('marcar todas como lidas zera a contagem', async () => {
    prepararAmbiente(buildFakeSocket());
    vi.spyOn(api, 'listarNotificacoes').mockResolvedValue({
      notificacoes: [buildNotificacao(), buildNotificacao({ id: 'n-2' })],
      naoLidas: 2,
    });
    const marcarTodas = vi.spyOn(api, 'marcarTodasNotificacoesComoLidas').mockResolvedValue();

    const { result } = renderHook(() => useNotificacoes(true));
    await waitFor(() => expect(result.current.naoLidas).toBe(2));

    act(() => result.current.marcarTodasComoLidas());

    expect(result.current.naoLidas).toBe(0);
    expect(result.current.notificacoes?.every((n) => n.lida)).toBe(true);
    expect(marcarTodas).toHaveBeenCalled();
  });

  it('desconecta o socket ao desmontar', () => {
    const socket = buildFakeSocket();
    prepararAmbiente(socket);
    vi.spyOn(api, 'listarNotificacoes').mockResolvedValue({ notificacoes: [], naoLidas: 0 });

    const { unmount } = renderHook(() => useNotificacoes(true));
    unmount();

    expect(socket.disconnect).toHaveBeenCalled();
  });
});
