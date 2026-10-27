import { Router } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { authGuard, requireRole } from '@/common/authGuard';
import { adminController } from './admin.controller';

export const adminRouter = Router();

adminRouter.use(authGuard, requireRole('ADMIN'));

adminRouter.post('/condominios', asyncHandler(adminController.criarCondominio));
adminRouter.get('/condominios', asyncHandler(adminController.listarCondominios));
adminRouter.patch('/condominios/:id', asyncHandler(adminController.atualizarCondominio));
adminRouter.post('/sindicos', asyncHandler(adminController.criarSindico));
adminRouter.get('/usuarios', asyncHandler(adminController.listarUsuarios));
adminRouter.get('/usuarios/:id/extrato', asyncHandler(adminController.extratoDoUsuario));
adminRouter.get('/plataforma/extrato', asyncHandler(adminController.extratoPlataforma));
adminRouter.get('/financeiro/resumo', asyncHandler(adminController.resumoFinanceiro));
