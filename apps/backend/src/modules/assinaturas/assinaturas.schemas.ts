import { z } from 'zod';
import { cpfOuCnpjValido } from '@/common/documento';

export const contratarSchema = z.object({
  planoCodigo: z.string().min(1, 'Escolha um plano'),
  periodoCodigo: z.string().min(1, 'Escolha o período de cobrança'),
  nomeCondominio: z.string().trim().min(3, 'Informe o nome do condomínio').max(80),
  nomeSindico: z.string().trim().min(2, 'Informe o seu nome').max(80),
  email: z.string().trim().email('E-mail inválido'),
  cpfCnpj: z.string().refine(cpfOuCnpjValido, 'CPF ou CNPJ inválido'),
  aceiteTermos: z.literal(true, {
    errorMap: () => ({ message: 'É preciso confirmar a contratação marcando a declaração' }),
  }),
});

export const assinaturaIdSchema = z.object({ id: z.string().uuid('Contratação inválida') });

/** Renovação: o período é opcional (sem ele, repete o período atual da assinatura). */
export const renovacaoSchema = z.object({ periodoCodigo: z.string().min(1).optional() });
