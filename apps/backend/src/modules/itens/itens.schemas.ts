import { z } from 'zod';

const textoOpcional = z
  .string()
  .trim()
  .max(120, 'Máximo de 120 caracteres')
  .transform((valor) => (valor === '' ? undefined : valor))
  .optional();

/** Acessórios que acompanham o item — conferidos na retirada e na devolução. */
const acessoriosSchema = z
  .array(z.string().trim().min(1, 'Acessório vazio').max(80, 'Máximo de 80 caracteres'))
  .max(30, 'No máximo 30 acessórios');

export const criarItemSchema = z.object({
  titulo: z.string().min(3, 'Título deve ter ao menos 3 caracteres').max(120),
  descricao: z.string().min(10, 'Descrição deve ter ao menos 10 caracteres'),
  categoria: z.string().min(2, 'Categoria é obrigatória'),
  valorDiaria: z.number().positive('Valor diário deve ser maior que zero'),
  fabricante: textoOpcional,
  modelo: textoOpcional,
  numeroSerie: textoOpcional,
  acessorios: acessoriosSchema.optional(),
  imagens: z.array(z.string().url('URL de imagem inválida')).optional(),
});

export const atualizarItemSchema = z
  .object({
    titulo: z.string().min(3).max(120).optional(),
    descricao: z.string().min(10).optional(),
    categoria: z.string().min(2).optional(),
    valorDiaria: z.number().positive().optional(),
    fabricante: textoOpcional,
    modelo: textoOpcional,
    numeroSerie: textoOpcional,
    acessorios: acessoriosSchema.optional(),
    ativo: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

export const listarItensQuerySchema = z.object({
  categoria: z.string().optional(),
});
