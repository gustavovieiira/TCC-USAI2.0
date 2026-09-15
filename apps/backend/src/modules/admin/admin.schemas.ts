import { z } from 'zod';

const pinSchema = z
  .string()
  .regex(/^\d{4,8}$/, 'PIN deve conter apenas dígitos (4 a 8 caracteres)');
const linkSlugSchema = z
  .string()
  .min(3, 'Link deve ter ao menos 3 caracteres')
  .regex(/^[a-z0-9-]+$/, 'Link deve conter apenas letras minúsculas, números e hífen');

export const criarCondominioSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  linkSlug: linkSlugSchema,
  pin: pinSchema,
});

export const atualizarCondominioSchema = z
  .object({
    nome: z.string().min(3).optional(),
    pin: pinSchema.optional(),
    ativo: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

export const listarCondominiosQuerySchema = z.object({
  ativo: z
    .enum(['true', 'false'])
    .optional()
    .transform((valor) => (valor === undefined ? undefined : valor === 'true')),
});

export const criarSindicoSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
  condominioId: z.string().min(1, 'Condomínio é obrigatório'),
});
