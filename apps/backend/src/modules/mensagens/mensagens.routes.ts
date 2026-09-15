import { Router } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { mensagensController } from './mensagens.controller';

/**
 * mergeParams: montado em locacoes.routes.ts como '/:id/mensagens' — precisa enxergar o :id
 * (locacaoId) do router pai. authGuard já foi aplicado lá antes deste sub-router.
 */
export const mensagensRouter = Router({ mergeParams: true });

mensagensRouter.post('/', asyncHandler(mensagensController.enviar));
mensagensRouter.get('/', asyncHandler(mensagensController.listar));
