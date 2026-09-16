import { Router } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { authGuard } from '@/common/authGuard';
import { muralController } from './mural.controller';

export const muralRouter = Router();

muralRouter.use(authGuard);

muralRouter.post('/', asyncHandler(muralController.criar));
muralRouter.get('/', asyncHandler(muralController.listar));
muralRouter.get('/:id', asyncHandler(muralController.buscarPorId));
muralRouter.post('/:id/respostas', asyncHandler(muralController.responder));
muralRouter.post('/:id/atender', asyncHandler(muralController.marcarAtendido));
muralRouter.delete('/:id', asyncHandler(muralController.excluir));
