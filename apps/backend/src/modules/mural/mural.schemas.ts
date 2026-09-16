import { z } from 'zod';

export const criarPostSchema = z.object({
  conteudo: z.string().min(3, 'Escreva ao menos 3 caracteres').max(2000),
  tipo: z.enum(['PEDIDO', 'AVISO']).default('PEDIDO'),
  categoria: z.string().min(2).optional(),
  condominioId: z.string().uuid().optional(),
});

export const responderPostSchema = z.object({
  conteudo: z.string().min(1, 'Resposta não pode ser vazia').max(2000),
});
