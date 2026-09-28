import { Request, Response } from 'express';
import { prisma } from '@/common/prisma';
import { logger } from '@/common/logger';
import { AsaasClient } from './asaas.client';
import { asaasWebhookSchema } from './pagamentos.schemas';
import { PagamentosService } from './pagamentos.service';

const pagamentosService = new PagamentosService(prisma, new AsaasClient());

/** Eventos do Asaas que valem como "PIX confirmado" — os demais são reconhecidos e ignorados. */
const EVENTOS_PAGAMENTO_CONFIRMADO = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'];

export const pagamentosController = {
  async criarCobranca(req: Request, res: Response) {
    const resultado = await pagamentosService.criarCobranca(req.params.id, req.auth!.userId);
    res.status(201).json(resultado);
  },
};

/**
 * Webhook do Asaas — NÃO fica atrás de `authGuard` (quem chama é o Asaas, não um usuário logado) e
 * de propósito nunca responde diferente de 200 depois de validar o token, mesmo se
 * `confirmarPagamento` falhar internamente: um 4xx/5xx faria o Asaas reentregar o mesmo evento
 * repetidas vezes, e um bug na nossa aplicação não se corrige com retry — só vira barulho
 * duplicado (cancelamentos repetidos, etc.). Por isso este handler não usa `asyncHandler`.
 */
export const asaasWebhookController = {
  async receber(req: Request, res: Response): Promise<void> {
    const tokenEsperado = process.env.ASAAS_WEBHOOK_TOKEN;
    const tokenRecebido = req.header('asaas-access-token');

    if (!tokenEsperado || tokenRecebido !== tokenEsperado) {
      res.status(401).json({ error: 'Token inválido' });
      return;
    }

    try {
      const body = asaasWebhookSchema.parse(req.body);
      if (EVENTOS_PAGAMENTO_CONFIRMADO.includes(body.event)) {
        await pagamentosService.confirmarPagamento(body.payment.id);
      }
    } catch (error) {
      logger.error('Falha ao processar webhook do Asaas', { error });
    }

    res.status(200).json({ ok: true });
  },
};
