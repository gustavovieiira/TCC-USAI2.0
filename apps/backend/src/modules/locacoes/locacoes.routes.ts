import { Router } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { authGuard } from '@/common/authGuard';
import { mensagensRouter } from '@/modules/mensagens/mensagens.routes';
import { locacoesController } from './locacoes.controller';

export const locacoesRouter = Router();

locacoesRouter.use(authGuard);

locacoesRouter.post('/', asyncHandler(locacoesController.solicitar));
locacoesRouter.get('/minhas', asyncHandler(locacoesController.listarComoLocatario));
locacoesRouter.get('/recebidas', asyncHandler(locacoesController.listarComoProprietario));
locacoesRouter.post('/:id/aprovar', asyncHandler(locacoesController.aprovar));
locacoesRouter.post('/:id/rejeitar', asyncHandler(locacoesController.rejeitar));

/** Chat da locação (histórico via REST; envio/recebimento ao vivo via WebSocket, ver realtime/socket.ts). */
locacoesRouter.use('/:id/mensagens', mensagensRouter);
