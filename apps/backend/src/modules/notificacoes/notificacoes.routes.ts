import { Router } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { authGuard } from '@/common/authGuard';
import { notificacoesController } from './notificacoes.controller';

export const notificacoesRouter = Router();

notificacoesRouter.use(authGuard);

notificacoesRouter.get('/', asyncHandler(notificacoesController.listar));
notificacoesRouter.post('/ler-todas', asyncHandler(notificacoesController.marcarTodasComoLidas));
notificacoesRouter.post('/:id/lida', asyncHandler(notificacoesController.marcarComoLida));
