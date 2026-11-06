import { Router } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { criarLimitador } from '@/common/rateLimit';
import { authGuard } from '@/common/authGuard';
import { authController } from './auth.controller';
import {
  limitarCadastroPorCondominio,
  limitarCadastroPorIp,
  limitarCadastros,
  limitarLoginPorEmail,
  limitarLoginPorIp,
  limitarRenovacaoDeSessao,
  limitarTrocaDeSenha,
} from './auth.limites';

export const authRouter = Router();

const limitarEsqueciSenha = criarLimitador({
  max: 10,
  janelaMs: 60 * 60 * 1000,
  mensagem: 'Muitos pedidos de nova senha a partir deste endereço. Tente novamente em uma hora.',
});

authRouter.post(
  '/cadastro',
  limitarCadastros,
  limitarCadastroPorIp,
  limitarCadastroPorCondominio,
  asyncHandler(authController.cadastrarMorador),
);
authRouter.post(
  '/login',
  limitarLoginPorIp,
  limitarLoginPorEmail,
  asyncHandler(authController.login),
);
authRouter.post('/definir-senha', limitarTrocaDeSenha, asyncHandler(authController.definirSenha));
authRouter.post('/esqueci-senha', limitarEsqueciSenha, asyncHandler(authController.esqueciSenha));
authRouter.post(
  '/redefinir-senha',
  limitarTrocaDeSenha,
  asyncHandler(authController.redefinirSenha),
);
authRouter.post('/refresh', limitarRenovacaoDeSessao, asyncHandler(authController.refresh));
authRouter.post('/logout', authGuard, asyncHandler(authController.logout));
authRouter.patch('/perfil', authGuard, asyncHandler(authController.atualizarPerfil));
