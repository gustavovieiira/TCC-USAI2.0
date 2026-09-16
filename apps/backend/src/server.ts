import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { createSocketServer } from './realtime/socket';
import { logger } from '@/common/logger';
import { prisma } from '@/common/prisma';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const UMA_HORA_MS = 60 * 60 * 1000;

const app = createApp();
const httpServer = http.createServer(app);
createSocketServer(httpServer);

httpServer.listen(PORT, () => {
  logger.info(`USAI backend rodando na porta ${PORT}`);
});

/**
 * Conversas privadas do Mural são efêmeras (no máximo 7 dias) e apagadas de vez — cada operação
 * sobre uma conversa já limpa as expiradas daquele condomínio (ver `ConversasService`), mas essa
 * varredura periódica garante a exclusão mesmo que ninguém mais volte a acessar o recurso.
 */
setInterval(() => {
  prisma.conversaPrivada
    .deleteMany({ where: { expiraEm: { lt: new Date() } } })
    .catch((error) => logger.error('Falha ao expirar conversas privadas do Mural', { error }));
}, UMA_HORA_MS);
