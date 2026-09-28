import { z } from 'zod';

/**
 * `.passthrough()` em vez de campos fechados: o Asaas manda bem mais informação (e pode adicionar
 * campos novos no futuro) do que o webhook precisa — só `event` e `payment.id` importam aqui.
 */
export const asaasWebhookSchema = z
  .object({
    event: z.string(),
    payment: z.object({ id: z.string() }).passthrough(),
  })
  .passthrough();
