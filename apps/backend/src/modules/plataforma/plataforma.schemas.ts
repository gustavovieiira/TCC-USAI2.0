import { z } from 'zod';
import { CATEGORIAS_DESPESA } from './plataforma.types';

/** "2026-11": mês consultado. Sem ele, vale o mês atual. */
export const vendasQuerySchema = z.object({
  mes: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês inválido (use AAAA-MM)')
    .optional(),
});

function dataValida(texto: string): boolean {
  const [ano, mes, dia] = texto.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  );
}

export const criarDespesaSchema = z.object({
  data: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use AAAA-MM-DD)')
    .refine(dataValida, 'Essa data não existe'),
  valor: z
    .number('Informe o valor')
    .positive('O valor precisa ser maior que zero')
    .max(1_000_000, 'Valor alto demais')
    .refine((valor) => Math.round(valor * 100) / 100 === valor, 'Use no máximo 2 casas decimais'),
  descricao: z
    .string('Informe a descrição')
    .trim()
    .min(3, 'A descrição precisa de ao menos 3 caracteres')
    .max(120, 'A descrição pode ter no máximo 120 caracteres'),
  categoria: z.enum(CATEGORIAS_DESPESA, 'Escolha uma categoria'),
});
