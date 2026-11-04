import { Router } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { criarLimitador } from '@/common/rateLimit';
import { authGuard } from '@/common/authGuard';
import { authController } from './auth.controller';

export const authRouter = Router();

const limitarEsqueciSenha = criarLimitador({
  max: 10,
  janelaMs: 60 * 60 * 1000,
  mensagem: 'Muitos pedidos de nova senha a partir deste endereço. Tente novamente em uma hora.',
});

authRouter.post('/cadastro', asyncHandler(authController.cadastrarMorador));
authRouter.post('/login', asyncHandler(authController.login));
authRouter.post('/definir-senha', asyncHandler(authController.definirSenha));
authRouter.post('/esqueci-senha', limitarEsqueciSenha, asyncHandler(authController.esqueciSenha));
authRouter.post('/redefinir-senha', asyncHandler(authController.redefinirSenha));
authRouter.post('/refresh', asyncHandler(authController.refresh));
authRouter.patch('/perfil', authGuard, asyncHandler(authController.atualizarPerfil));
