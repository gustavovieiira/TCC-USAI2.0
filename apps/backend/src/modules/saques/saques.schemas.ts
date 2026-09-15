import { z } from 'zod';

export const solicitarSaqueSchema = z.object({
  valor: z.number().positive('Valor deve ser maior que zero'),
  chavePixUsada: z.string().min(1, 'Chave PIX é obrigatória'),
});

export const rejeitarSaqueSchema = z.object({
  motivoRejeicao: z.string().min(3, 'Informe o motivo da rejeição'),
});

export const listarSaquesQuerySchema = z.object({
  status: z.enum(['PENDENTE', 'APROVADO', 'REJEITADO']).optional(),
});
