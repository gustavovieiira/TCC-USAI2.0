import { Router } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { authGuard } from '@/common/authGuard';
import { locacoesController } from './locacoes.controller';

export const locacoesRouter = Router();

locacoesRouter.use(authGuard);

locacoesRouter.post('/', asyncHandler(locacoesController.solicitar));
locacoesRouter.get('/minhas', asyncHandler(locacoesController.listarComoLocatario));
locacoesRouter.get('/recebidas', asyncHandler(locacoesController.listarComoProprietario));
locacoesRouter.post('/:id/aprovar', asyncHandler(locacoesController.aprovar));
locacoesRouter.post('/:id/rejeitar', asyncHandler(locacoesController.rejeitar));
