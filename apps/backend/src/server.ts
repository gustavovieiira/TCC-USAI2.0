import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { createSocketServer } from './realtime/socket';
import { logger } from '@/common/logger';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = createApp();
const httpServer = http.createServer(app);
createSocketServer(httpServer);

httpServer.listen(PORT, () => {
  logger.info(`USAI backend rodando na porta ${PORT}`);
});
