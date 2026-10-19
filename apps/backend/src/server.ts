import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { setSocketServer } from './realtime/emitter';
import { createSocketServer } from './realtime/socket';
import { logger } from '@/common/logger';
import { prisma } from '@/common/prisma';
import { NotificacoesService } from '@/modules/notificacoes/notificacoes.service';
import { AsaasClient } from '@/modules/pagamentos/asaas.client';
import { PagamentosService } from '@/modules/pagamentos/pagamentos.service';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const UMA_HORA_MS = 60 * 60 * 1000;
const TRINTA_SEGUNDOS_MS = 30 * 1000;

const app = createApp();
const httpServer = http.createServer(app);
setSocketServer(createSocketServer(httpServer));

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

/** Notificações guardam só os últimos 30 dias (ver `NotificacoesService#removerAntigas`). */
const notificacoesService = new NotificacoesService(prisma);
setInterval(() => {
  notificacoesService
    .removerAntigas()
    .catch((error) => logger.error('Falha ao limpar notificações antigas', { error }));
}, UMA_HORA_MS);

/**
 * Rede de segurança do webhook do Asaas: a cada 30s confere as cobranças ainda pendentes direto na
 * API do Asaas e confirma as já pagas (ver `PagamentosService#conferirPendentes`). Só liga com
 * `ASAAS_API_KEY` configurada, e nunca roda duas conferências ao mesmo tempo.
 */
if (process.env.ASAAS_API_KEY) {
  const pagamentosService = new PagamentosService(prisma, new AsaasClient(), notificacoesService);
  let conferindo = false;

  setInterval(() => {
    if (conferindo) return;
    conferindo = true;

    pagamentosService
      .conferirPendentes()
      .catch((error) => logger.error('Falha na conferência periódica de pagamentos', { error }))
      .finally(() => {
        conferindo = false;
      });
  }, TRINTA_SEGUNDOS_MS);

  logger.info('Conferência periódica de pagamentos do Asaas ativa (a cada 30s)');
} else {
  logger.warn('ASAAS_API_KEY não configurada — conferência periódica de pagamentos desligada');
}
