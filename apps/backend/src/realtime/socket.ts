import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '@/common/authGuard';
import { logger } from '@/common/logger';
import { prisma } from '@/common/prisma';
import { ConversasService } from '@/modules/conversas/conversas.service';
import { MensagemPrivadaDTO } from '@/modules/conversas/conversas.types';
import { MensagensService } from '@/modules/mensagens/mensagens.service';
import { MensagemDTO } from '@/modules/mensagens/mensagens.types';

interface CreateSocketServerOptions {
  /** Injetáveis nos testes para rodar sem depender do Prisma real. */
  mensagensService?: MensagensService;
  conversasService?: ConversasService;
}

type EnviarMensagemPayload = { locacaoId: string; conteudo: string };
type EnviarMensagemAck = { ok: true; mensagem: MensagemDTO } | { ok: false; erro: string };
type EntrarLocacaoAck = (ok: boolean) => void;

type EnviarMensagemPrivadaPayload = { conversaId: string; conteudo: string };
type EnviarMensagemPrivadaAck =
  { ok: true; mensagem: MensagemPrivadaDTO } | { ok: false; erro: string };
type EntrarConversaAck = (ok: boolean) => void;

function nomeSala(locacaoId: string): string {
  return `locacao:${locacaoId}`;
}

function nomeSalaConversa(conversaId: string): string {
  return `conversa:${conversaId}`;
}

function nomeSalaUsuario(userId: string): string {
  return `usuario:${userId}`;
}

/**
 * Dois chats em tempo real no mesmo servidor de WebSocket — histórico de ambos continua via REST,
 * só o envio/recebimento ao vivo acontece aqui:
 * - Locação (`locacao:*`): sala por locação, entre locatário e dono do item.
 * - Conversa privada do Mural (`conversa:*`): sala por conversa 1:1 aberta a partir de um post ou
 *   comentário (ver `modules/conversas`), efêmera (expira em 7 dias).
 */
export function createSocketServer(
  httpServer: HttpServer,
  options: CreateSocketServerOptions = {},
): SocketIOServer {
  const mensagensService = options.mensagensService ?? new MensagensService(prisma);
  const conversasService = options.conversasService ?? new ConversasService(prisma);

  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
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
    socket.join(nomeSalaUsuario(userId));

    socket.on('locacao:entrar', async (locacaoId: string, callback?: EntrarLocacaoAck) => {
      try {
        await mensagensService.verificarParticipante(locacaoId, userId);
        socket.join(nomeSala(locacaoId));
        callback?.(true);
      } catch {
        callback?.(false);
      }
    });

    socket.on(
      'mensagem:enviar',
      async (payload: EnviarMensagemPayload, callback?: (ack: EnviarMensagemAck) => void) => {
        try {
          const mensagem = await mensagensService.enviar(payload.locacaoId, userId, {
            conteudo: payload.conteudo,
          });

          io.to(nomeSala(payload.locacaoId)).emit('mensagem:nova', mensagem);
          callback?.({ ok: true, mensagem });
        } catch (error) {
          const erro = error instanceof Error ? error.message : 'Erro ao enviar mensagem';
          callback?.({ ok: false, erro });
        }
      },
    );

    socket.on('conversa:entrar', async (conversaId: string, callback?: EntrarConversaAck) => {
      try {
        if (!condominioId) throw new Error('sem condomínio');
        await conversasService.verificarParticipante(conversaId, condominioId, userId);
        socket.join(nomeSalaConversa(conversaId));
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
