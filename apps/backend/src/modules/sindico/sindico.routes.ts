import { Router } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { authGuard, requireRole } from '@/common/authGuard';
import { sindicoController } from './sindico.controller';

export const sindicoRouter = Router();

sindicoRouter.use(authGuard, requireRole('SINDICO'));

sindicoRouter.get('/condominio', asyncHandler(sindicoController.buscarCondominio));
sindicoRouter.patch('/condominio/pin', asyncHandler(sindicoController.atualizarPin));
sindicoRouter.get('/moradores', asyncHandler(sindicoController.listarMoradores));
sindicoRouter.delete('/moradores/:id', asyncHandler(sindicoController.removerMorador));
sindicoRouter.get('/locacoes', asyncHandler(sindicoController.listarLocacoesAtivas));
