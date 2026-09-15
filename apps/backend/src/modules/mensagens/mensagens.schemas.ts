import { z } from 'zod';

export const enviarMensagemSchema = z.object({
  conteudo: z.string().min(1, 'Mensagem não pode ser vazia').max(2000, 'Mensagem muito longa'),
});
