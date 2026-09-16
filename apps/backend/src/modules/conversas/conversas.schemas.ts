import { z } from 'zod';

export const abrirConversaSchema = z.object({
  usuarioId: z.string().uuid(),
  postOrigemId: z.string().uuid().optional(),
});

export const enviarMensagemPrivadaSchema = z.object({
  conteudo: z.string().min(1, 'Mensagem não pode ser vazia').max(2000, 'Mensagem muito longa'),
});
