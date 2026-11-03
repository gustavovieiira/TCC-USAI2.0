import { Router } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { criarLimitador } from '@/common/rateLimit';
import { assinaturasController } from './assinaturas.controller';

/** Rotas públicas (sem login): a contratação acontece antes de o síndico ter conta. */
export const assinaturasRouter = Router();

const limitarContratacoes = criarLimitador({
  max: 8,
  janelaMs: 60 * 60 * 1000,
  mensagem: 'Muitas contratações a partir deste endereço. Tente novamente em uma hora.',
});

const limitarReenvios = criarLimitador({ max: 10, janelaMs: 60 * 60 * 1000 });

assinaturasRouter.get('/planos', assinaturasController.listarPlanos);
assinaturasRouter.post(
  '/contratar',
  limitarContratacoes,
  asyncHandler(assinaturasController.contratar),
);
assinaturasRouter.get('/:id/status', asyncHandler(assinaturasController.consultarStatus));
assinaturasRouter.post(
  '/:id/reenviar-acesso',
  limitarReenvios,
  asyncHandler(assinaturasController.reenviarAcesso),
);
