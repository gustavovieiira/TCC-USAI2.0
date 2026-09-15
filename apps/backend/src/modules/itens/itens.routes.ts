import { Router } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { authGuard } from '@/common/authGuard';
import { itensController } from './itens.controller';

export const itensRouter = Router();

itensRouter.use(authGuard);

itensRouter.post('/', asyncHandler(itensController.criar));
itensRouter.get('/', asyncHandler(itensController.listar));
itensRouter.get('/:id', asyncHandler(itensController.buscarPorId));
itensRouter.patch('/:id', asyncHandler(itensController.atualizar));
itensRouter.delete('/:id', asyncHandler(itensController.remover));
