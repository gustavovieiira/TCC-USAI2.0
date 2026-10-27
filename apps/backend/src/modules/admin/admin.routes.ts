import { Router } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { authGuard, requireRole } from '@/common/authGuard';
import { movimentacoesController } from '@/modules/movimentacoes/movimentacoes.controller';
import { configuracaoController } from '@/modules/configuracao/configuracao.controller';
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

// Identidade da plataforma: logo oficial (upload), nome e rodapé institucionais.
adminRouter.post('/configuracao/logo', asyncHandler(configuracaoController.enviarLogo));
adminRouter.delete('/configuracao/logo', asyncHandler(configuracaoController.removerLogo));
adminRouter.put('/configuracao', asyncHandler(configuracaoController.atualizarTextos));

// Termos de responsabilidade (versionados) e auditoria dos documentos de retirada/devolução.
adminRouter.get('/termos', asyncHandler(movimentacoesController.listarTermos));
adminRouter.post('/termos', asyncHandler(movimentacoesController.criarTermo));
adminRouter.post('/termos/:id/aprovar', asyncHandler(movimentacoesController.aprovarTermo));
adminRouter.get('/movimentacoes', asyncHandler(movimentacoesController.listarRecentes));
