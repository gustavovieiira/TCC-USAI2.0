import { Server as SocketIOServer } from 'socket.io';
import { nomeSalaUsuario } from './socket';

/**
 * Seam pra código fora do ciclo de vida de conexão do socket.io (ex.: o webhook do Asaas em
 * `pagamentos.service.ts`, chamado por uma requisição HTTP comum) avisar um usuário específico em
 * tempo real, sem precisar conhecer a instância de `SocketIOServer` criada em `server.ts`.
 */
let ioInstance: SocketIOServer | null = null;

export function setSocketServer(io: SocketIOServer): void {
  ioInstance = io;
}

export function emitirParaUsuario(userId: string, evento: string, payload: unknown): void {
  ioInstance?.to(nomeSalaUsuario(userId)).emit(evento, payload);
}
