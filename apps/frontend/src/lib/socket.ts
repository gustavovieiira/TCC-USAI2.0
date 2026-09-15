import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './authStorage';
import { MensagemDTO } from '@/features/mensagens/mensagens.types';

interface ServerToClientEvents {
  'mensagem:nova': (mensagem: MensagemDTO) => void;
}

interface ClientToServerEvents {
  'locacao:entrar': (locacaoId: string, callback: (ok: boolean) => void) => void;
  'mensagem:enviar': (
    payload: { locacaoId: string; conteudo: string },
    callback: (ack: { ok: true; mensagem: MensagemDTO } | { ok: false; erro: string }) => void,
  ) => void;
}

export type LocacaoSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * O Socket.IO roda no mesmo processo/porta do Express (ver apps/backend/src/realtime/socket.ts),
 * na raiz — não sob /api. VITE_API_URL aponta pra .../api, então derivamos a origem removendo o
 * sufixo em vez de exigir uma env var separada só pro socket.
 */
const SOCKET_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(
  /\/api\/?$/,
  '',
);

export function createLocacaoSocket(): LocacaoSocket {
  return io(SOCKET_URL, {
    auth: { token: getAccessToken() ?? undefined },
    transports: ['websocket'],
  });
}
