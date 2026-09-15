import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '@/common/authGuard';
import { logger } from '@/common/logger';
import { prisma } from '@/common/prisma';
import { MensagensService } from '@/modules/mensagens/mensagens.service';
import { MensagemDTO } from '@/modules/mensagens/mensagens.types';

interface CreateSocketServerOptions {
  /** Injetável nos testes para rodar sem depender do Prisma real. */
  mensagensService?: MensagensService;
}

type EnviarMensagemPayload = { locacaoId: string; conteudo: string };
type EnviarMensagemAck = { ok: true; mensagem: MensagemDTO } | { ok: false; erro: string };
type EntrarLocacaoAck = (ok: boolean) => void;

function nomeSala(locacaoId: string): string {
  return `locacao:${locacaoId}`;
}

/**
 * Chat em tempo real das locações: histórico continua via REST
 * (GET /api/locacoes/:id/mensagens em mensagens.routes.ts), mas o envio/recebimento ao vivo
 * acontece aqui — o cliente entra na sala da locação e recebe 'mensagem:nova' conforme
 * outros participantes enviam.
 */
export function createSocketServer(
  httpServer: HttpServer,
  options: CreateSocketServerOptions = {},
): SocketIOServer {
  const mensagensService = options.mensagensService ?? new MensagensService(prisma);

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
  });

  logger.info('Servidor de WebSocket (mensagens em tempo real) inicializado');

  return io;
}
