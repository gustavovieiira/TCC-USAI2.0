import { Router } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { pagamentosController } from './pagamentos.controller';

/** mergeParams: montado em locacoes.routes.ts como '/:id/pagamento'. authGuard já aplicado lá. */
export const pagamentosRouter = Router({ mergeParams: true });

pagamentosRouter.post('/', asyncHandler(pagamentosController.criarCobranca));
