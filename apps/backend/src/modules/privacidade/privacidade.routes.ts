import { Router } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { authGuard } from '@/common/authGuard';
import { limitarFalhas } from '@/common/rateLimit';
import { privacidadeController } from './privacidade.controller';

export const privacidadeRouter = Router();

/** A exclusão pede a senha: sem limite, um token roubado serviria para adivinhá-la. */
const limitarSenhaErrada = limitarFalhas({
  max: 5,
  janelaMs: 15 * 60 * 1000,
  chave: (req) => req.auth?.userId,
  falhou: (status) => status === 401,
  zeraNoSucesso: true,
  mensagem: 'Muitas tentativas com a senha errada. Aguarde 15 minutos.',
});

privacidadeRouter.use(authGuard);

privacidadeRouter.get('/meus-dados', asyncHandler(privacidadeController.meusDados));
privacidadeRouter.post(
  '/excluir-conta',
  limitarSenhaErrada,
  asyncHandler(privacidadeController.excluirConta),
);
