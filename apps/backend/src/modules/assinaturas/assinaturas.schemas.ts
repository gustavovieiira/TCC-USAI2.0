import { z } from 'zod';
import { cpfOuCnpjValido } from '@/common/documento';

export const contratarSchema = z.object({
  planoCodigo: z.string().min(1, 'Escolha um plano'),
  nomeCondominio: z.string().trim().min(3, 'Informe o nome do condomínio').max(80),
  nomeSindico: z.string().trim().min(2, 'Informe o seu nome').max(80),
  email: z.string().trim().email('E-mail inválido'),
  cpfCnpj: z.string().refine(cpfOuCnpjValido, 'CPF ou CNPJ inválido'),
  aceiteTermos: z.literal(true, {
    errorMap: () => ({ message: 'É preciso confirmar a contratação marcando a declaração' }),
  }),
});

export const assinaturaIdSchema = z.object({ id: z.string().uuid('Contratação inválida') });
