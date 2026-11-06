import cors from 'cors';
import express, { Express } from 'express';
import { origensPermitidas } from '@/common/cors';
import { somenteRedePrivada } from '@/common/redePrivada';
import { errorHandler } from '@/common/errorHandler';
import { securityHeaders, semCache } from '@/common/securityHeaders';
import { UPLOADS_DIR } from '@/common/uploads';
import { metricsMiddleware } from '@/metrics/metricsMiddleware';
import { metricsRegistry } from '@/metrics/registry';
import { adminRouter } from '@/modules/admin/admin.routes';
import { assinaturasRouter } from '@/modules/assinaturas/assinaturas.routes';
import { authRouter } from '@/modules/auth/auth.routes';
import { configuracaoRouter } from '@/modules/configuracao/configuracao.routes';
import { conversasRouter } from '@/modules/conversas/conversas.routes';
import { itensRouter } from '@/modules/itens/itens.routes';
import { locacoesRouter } from '@/modules/locacoes/locacoes.routes';
import { notificacoesRouter } from '@/modules/notificacoes/notificacoes.routes';
import { movimentacoesRouter } from '@/modules/movimentacoes/movimentacoes.routes';
import { muralRouter } from '@/modules/mural/mural.routes';
import { asaasWebhookRouter } from '@/modules/pagamentos/webhook.routes';
import { privacidadeRouter } from '@/modules/privacidade/privacidade.routes';
import { saquesRouter } from '@/modules/saques/saques.routes';
import { sindicoRouter } from '@/modules/sindico/sindico.routes';

export function createApp(): Express {
  const app = express();

  // Não anuncia o framework (X-Powered-By) e envia os cabeçalhos de segurança básicos.
  app.disable('x-powered-by');

  // Atrás de um proxy (nginx, balanceador), o IP de quem chamou vem no X-Forwarded-For. `TRUST_PROXY` é o
  // NÚMERO de proxies entre a internet e a API (por exemplo 1). Nunca use `true`: qualquer um poderia forjar o IP
  // e escapar dos limitadores de tentativas.
  const confiarNoProxy = process.env.TRUST_PROXY?.trim();
  if (confiarNoProxy) {
    app.set('trust proxy', /^\d+$/.test(confiarNoProxy) ? Number(confiarNoProxy) : confiarNoProxy);
  }

  app.use(securityHeaders);
  app.use(cors({ origin: origensPermitidas() }));
  app.use(express.json({ limit: '100kb' }));
  app.use(metricsMiddleware);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/metrics', somenteRedePrivada, async (_req, res) => {
    res.set('Content-Type', metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  });

  app.use('/api', semCache);
  app.use('/api/assinaturas', assinaturasRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/configuracao', configuracaoRouter);
  app.use('/api/conversas', conversasRouter);
  app.use('/api/itens', itensRouter);
  app.use('/api/locacoes', locacoesRouter);
  app.use('/api/movimentacoes', movimentacoesRouter);
  app.use('/api/mural', muralRouter);
  app.use('/api/notificacoes', notificacoesRouter);
  app.use('/api/privacidade', privacidadeRouter);
  app.use('/api/saques', saquesRouter);
  app.use('/api/sindico', sindicoRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/webhooks/asaas', asaasWebhookRouter);

  app.use('/uploads', express.static(UPLOADS_DIR));

  app.use(errorHandler);

  return app;
}
