import { Router } from 'express';
import { asaasWebhookController } from './pagamentos.controller';

/**
 * Montado direto em app.ts em '/api/webhooks/asaas', fora de authGuard — quem chama é o Asaas, não
 * um usuário logado. Sem asyncHandler: o handler nunca lança (ver pagamentos.controller.ts).
 */
export const asaasWebhookRouter = Router();

asaasWebhookRouter.post('/', asaasWebhookController.receber);
