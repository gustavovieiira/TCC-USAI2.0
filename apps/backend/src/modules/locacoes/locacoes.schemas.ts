import { z } from 'zod';

export const criarLocacaoSchema = z
  .object({
    itemId: z.string().min(1, 'Item é obrigatório'),
    dataInicio: z.coerce.date({ errorMap: () => ({ message: 'Data de início inválida' }) }),
    dataFim: z.coerce.date({ errorMap: () => ({ message: 'Data de fim inválida' }) }),
    finalidade: z
      .string()
      .trim()
      .max(500, 'A finalidade pode ter no máximo 500 caracteres')
      .transform((valor) => (valor === '' ? undefined : valor))
      .optional(),
  })
  .refine((data) => data.dataFim > data.dataInicio, {
    message: 'Data de fim deve ser posterior à data de início',
    path: ['dataFim'],
  })
  .refine((data) => data.dataInicio >= new Date(new Date().toDateString()), {
    message: 'Data de início não pode estar no passado',
    path: ['dataInicio'],
  });
