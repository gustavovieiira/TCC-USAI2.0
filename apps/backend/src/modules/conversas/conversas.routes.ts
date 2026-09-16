import { Router } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { authGuard } from '@/common/authGuard';
import { conversasController } from './conversas.controller';

export const conversasRouter = Router();

conversasRouter.use(authGuard);

conversasRouter.post('/', asyncHandler(conversasController.abrir));
conversasRouter.get('/', asyncHandler(conversasController.listarMinhas));
// Antes de '/:id' — senão "usuarios" seria capturado como um :id.
conversasRouter.get('/usuarios', asyncHandler(conversasController.listarUsuarios));
conversasRouter.get('/:id', asyncHandler(conversasController.buscarPorId));
conversasRouter.get('/:id/mensagens', asyncHandler(conversasController.listarMensagens));
conversasRouter.post('/:id/mensagens', asyncHandler(conversasController.enviarMensagem));
