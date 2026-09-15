import 'dotenv/config';
import { createApp } from './app';
import { logger } from '@/common/logger';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = createApp();

app.listen(PORT, () => {
  logger.info(`USAI backend rodando na porta ${PORT}`);
});
