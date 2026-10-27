import { z } from 'zod';

const acessorioSchema = z.object({
  nome: z.string().trim().min(1, 'Acessório sem nome').max(80),
  conferido: z.boolean(),
});

export const registrarMovimentacaoSchema = z.object({
  tipo: z.enum(['RETIRADA', 'DEVOLUCAO']),
  estadoConservacao: z.enum(['OTIMO', 'BOM', 'REGULAR', 'COM_AVARIAS'], {
    errorMap: () => ({ message: 'Informe o estado de conservação' }),
  }),
  acessorios: z.array(acessorioSchema).max(50, 'No máximo 50 acessórios'),
  observacoes: z
    .string()
    .trim()
    .max(1000, 'As observações podem ter no máximo 1000 caracteres')
    .transform((valor) => (valor === '' ? undefined : valor))
    .optional(),
});

export const aceitarMovimentacaoSchema = z.object({
  declaracoes: z.array(z.string().min(1)).max(20),
  senha: z.string().min(1, 'Confirme a sua senha para assinar'),
});

export const retificarMovimentacaoSchema = z.object({
  texto: z
    .string()
    .trim()
    .min(5, 'Descreva a correção com ao menos 5 caracteres')
    .max(1000, 'A retificação pode ter no máximo 1000 caracteres'),
});

export const tipoMovimentacaoSchema = z.enum(['RETIRADA', 'DEVOLUCAO']);

export const criarTermoSchema = z.object({
  tipo: tipoMovimentacaoSchema,
  titulo: z.string().trim().min(5, 'Informe o título do termo').max(191),
  clausulas: z
    .array(z.string().trim().min(5, 'Cláusula muito curta').max(1500))
    .min(1, 'Informe ao menos uma cláusula')
    .max(30),
  declaracoes: z
    .array(
      z.object({
        id: z
          .string()
          .trim()
          .regex(/^[a-z0-9_-]{2,40}$/, 'Identificador da declaração inválido'),
        texto: z.string().trim().min(10, 'Declaração muito curta').max(600),
      }),
    )
    .min(1, 'Informe ao menos uma declaração de aceite')
    .max(10)
    .refine((lista) => new Set(lista.map((d) => d.id)).size === lista.length, {
      message: 'As declarações não podem repetir o identificador',
    }),
});
