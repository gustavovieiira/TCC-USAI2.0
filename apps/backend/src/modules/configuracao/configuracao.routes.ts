import { Router } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { configuracaoController } from './configuracao.controller';

/** Leitura pública da identidade (logo, nome, rodapé). A edição é do Admin — ver admin.routes.ts. */
export const configuracaoRouter = Router();

configuracaoRouter.get('/', asyncHandler(configuracaoController.obter));
