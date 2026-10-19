import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './authStorage';
import { MensagemPrivadaDTO } from '@/features/conversas/conversas.types';
import { NotificacaoDTO } from '@/features/notificacoes/notificacoes.types';

export interface LocacaoAtualizadaEvento {
  locacaoId: string;
  status: 'PAGA' | 'CANCELADA';
}

interface ConversaServerToClientEvents {
  'conversa:mensagem:nova': (mensagem: MensagemPrivadaDTO) => void;
  /** M3 — pagamento confirmado (ou perdeu a corrida pra outra locação concorrente do mesmo item). */
  'locacao:atualizada': (evento: LocacaoAtualizadaEvento) => void;
  /** Aviso persistido novo (pedido de locação, pagamento, saque...) — ver módulo notificacoes. */
  'notificacao:nova': (notificacao: NotificacaoDTO) => void;
}

interface ConversaClientToServerEvents {
  'conversa:entrar': (conversaId: string, callback: (ok: boolean) => void) => void;
  'conversa:mensagem:enviar': (
    payload: { conversaId: string; conteudo: string },
    callback: (
      ack: { ok: true; mensagem: MensagemPrivadaDTO } | { ok: false; erro: string },
    ) => void,
  ) => void;
}

export type ConversaSocket = Socket<ConversaServerToClientEvents, ConversaClientToServerEvents>;

/**
 * O Socket.IO roda no mesmo processo/porta do Express (ver apps/backend/src/realtime/socket.ts),
 * na raiz — não sob /api. VITE_API_URL aponta pra .../api, então derivamos a origem removendo o
 * sufixo em vez de exigir uma env var separada só pro socket.
 */
const SOCKET_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(
  /\/api\/?$/,
  '',
);

export function createConversaSocket(): ConversaSocket {
  return io(SOCKET_URL, {
    auth: { token: getAccessToken() ?? undefined },
    transports: ['websocket'],
  });
}
