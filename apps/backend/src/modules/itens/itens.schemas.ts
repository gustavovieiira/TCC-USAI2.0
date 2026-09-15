import { z } from 'zod';

export const criarItemSchema = z.object({
  titulo: z.string().min(3, 'Título deve ter ao menos 3 caracteres').max(120),
  descricao: z.string().min(10, 'Descrição deve ter ao menos 10 caracteres'),
  categoria: z.string().min(2, 'Categoria é obrigatória'),
  valorDiaria: z.number().positive('Valor diário deve ser maior que zero'),
  imagens: z.array(z.string().url('URL de imagem inválida')).optional(),
});

export const atualizarItemSchema = z
  .object({
    titulo: z.string().min(3).max(120).optional(),
    descricao: z.string().min(10).optional(),
    categoria: z.string().min(2).optional(),
    valorDiaria: z.number().positive().optional(),
    ativo: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

export const listarItensQuerySchema = z.object({
  categoria: z.string().optional(),
});
