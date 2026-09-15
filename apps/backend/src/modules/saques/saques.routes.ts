import { Router } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { authGuard, requireRole } from '@/common/authGuard';
import { saquesController } from './saques.controller';

export const saquesRouter = Router();

saquesRouter.use(authGuard);

saquesRouter.post('/', asyncHandler(saquesController.solicitar));
saquesRouter.get('/minhas', asyncHandler(saquesController.listarMinhas));

saquesRouter.get('/', requireRole('ADMIN'), asyncHandler(saquesController.listarTodas));
saquesRouter.post('/:id/aprovar', requireRole('ADMIN'), asyncHandler(saquesController.aprovar));
saquesRouter.post('/:id/rejeitar', requireRole('ADMIN'), asyncHandler(saquesController.rejeitar));
