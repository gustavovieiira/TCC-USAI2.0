import cors from 'cors';
import express, { Express } from 'express';
import { errorHandler } from '@/common/errorHandler';
import { metricsMiddleware } from '@/metrics/metricsMiddleware';
import { metricsRegistry } from '@/metrics/registry';
import { authRouter } from '@/modules/auth/auth.routes';
import { itensRouter } from '@/modules/itens/itens.routes';
import { locacoesRouter } from '@/modules/locacoes/locacoes.routes';
import { saquesRouter } from '@/modules/saques/saques.routes';
import { sindicoRouter } from '@/modules/sindico/sindico.routes';

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(metricsMiddleware);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  });

  app.use('/api/auth', authRouter);
  app.use('/api/itens', itensRouter);
  app.use('/api/locacoes', locacoesRouter);
  app.use('/api/saques', saquesRouter);
  app.use('/api/sindico', sindicoRouter);

  app.use(errorHandler);

  return app;
}
