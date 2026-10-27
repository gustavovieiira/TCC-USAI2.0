import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '@/common/authGuard';
import { origensPermitidas } from '@/common/cors';
import { logger } from '@/common/logger';
import { prisma } from '@/common/prisma';
import { ConversasService } from '@/modules/conversas/conversas.service';
import { MensagemPrivadaDTO } from '@/modules/conversas/conversas.types';

interface CreateSocketServerOptions {
  /** Injetáveis nos testes para rodar sem depender do Prisma real. */
  conversasService?: ConversasService;
}

type EnviarMensagemPrivadaPayload = { conversaId: string; conteudo: string };
type EnviarMensagemPrivadaAck =
  { ok: true; mensagem: MensagemPrivadaDTO } | { ok: false; erro: string };
type EntrarConversaAck = (ok: boolean) => void;

function nomeSalaConversa(conversaId: string): string {
  return `conversa:${conversaId}`;
}

/** Exportado pra `realtime/emitter.ts` poder avisar um usuário específico fora do fluxo de sockets. */
export function nomeSalaUsuario(userId: string): string {
  return `usuario:${userId}`;
}

/**
 * Chat em tempo real (histórico via REST, só o envio/recebimento ao vivo passa por aqui). Um único
 * tipo de sala — `conversa:*` — serve tanto às conversas abertas no Mural (efêmeras) quanto ao chat
 * de cada locação (ver `modules/conversas`). A sala pessoal `usuario:*` recebe os avisos de mensagem
 * nova e as notificações.
 */
export function createSocketServer(
  httpServer: HttpServer,
  options: CreateSocketServerOptions = {},
): SocketIOServer {
  const conversasService = options.conversasService ?? new ConversasService(prisma);

  const io = new SocketIOServer(httpServer, {
    cors: { origin: origensPermitidas() },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      next(new Error('Token de acesso ausente'));
      return;
    }

    try {
      socket.data.auth = verifyAccessToken(token);
      next();
    } catch {
      next(new Error('Token inválido ou expirado'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.auth.userId as string;
    const condominioId = socket.data.auth.condominioId as string | null;

    // Sala pessoal: garante que o destinatário receba o aviso de mensagem nova mesmo antes de
    // entrar na sala específica da conversa (ex.: é a primeira mensagem de uma conversa nova).
    void socket.join(nomeSalaUsuario(userId));

    socket.on('conversa:entrar', async (conversaId: string, callback?: EntrarConversaAck) => {
      try {
        if (!condominioId) throw new Error('sem condomínio');
        await conversasService.verificarParticipante(conversaId, condominioId, userId);
        await socket.join(nomeSalaConversa(conversaId));
        callback?.(true);
      } catch {
        callback?.(false);
      }
    });

    socket.on(
      'conversa:mensagem:enviar',
      async (
        payload: EnviarMensagemPrivadaPayload,
        callback?: (ack: EnviarMensagemPrivadaAck) => void,
      ) => {
        try {
          if (!condominioId) throw new Error('Este perfil não está vinculado a um condomínio');

          const mensagem = await conversasService.enviarMensagem(
            payload.conversaId,
            condominioId,
            userId,
            { conteudo: payload.conteudo },
          );

          const destinatarioId = await conversasService.buscarOutroParticipanteId(
            payload.conversaId,
            userId,
          );
          const salas = [nomeSalaConversa(payload.conversaId)];
          if (destinatarioId) salas.push(nomeSalaUsuario(destinatarioId));

          io.to(salas).emit('conversa:mensagem:nova', mensagem);
          callback?.({ ok: true, mensagem });
        } catch (error) {
          const erro = error instanceof Error ? error.message : 'Erro ao enviar mensagem';
          callback?.({ ok: false, erro });
        }
      },
    );
  });

  logger.info('Servidor de WebSocket (mensagens em tempo real) inicializado');

  return io;
}
