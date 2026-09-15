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
adminRouter.get('/financeiro/resumo', asyncHandler(adminController.resumoFinanceiro));
