import { Router } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { authGuard } from '@/common/authGuard';
import { movimentacoesController } from './movimentacoes.controller';

/** `/api/movimentacoes` — o documento em si: ver, aceitar, cancelar e retificar. */
export const movimentacoesRouter = Router();

movimentacoesRouter.use(authGuard);

// Antes de '/:id' — senão "termos" seria capturado como um :id.
movimentacoesRouter.get('/termos/:tipo', asyncHandler(movimentacoesController.termoVigente));
movimentacoesRouter.get('/:id', asyncHandler(movimentacoesController.detalhe));
movimentacoesRouter.post('/:id/aceite', asyncHandler(movimentacoesController.aceitar));
movimentacoesRouter.post('/:id/cancelar', asyncHandler(movimentacoesController.cancelar));
movimentacoesRouter.post('/:id/retificacoes', asyncHandler(movimentacoesController.retificar));

/** `/api/locacoes/:id/movimentacoes` — lista e registra a retirada/devolução de uma locação. */
export const locacaoMovimentacoesRouter = Router({ mergeParams: true });

locacaoMovimentacoesRouter.get('/', asyncHandler(movimentacoesController.listarPorLocacao));
locacaoMovimentacoesRouter.post('/', asyncHandler(movimentacoesController.registrar));
