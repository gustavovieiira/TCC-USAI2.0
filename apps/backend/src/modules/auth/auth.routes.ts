import { Router } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { authGuard } from '@/common/authGuard';
import { authController } from './auth.controller';

export const authRouter = Router();

authRouter.post('/cadastro', asyncHandler(authController.cadastrarMorador));
authRouter.post('/login', asyncHandler(authController.login));
authRouter.post('/refresh', asyncHandler(authController.refresh));
authRouter.patch('/perfil', authGuard, asyncHandler(authController.atualizarPerfil));
