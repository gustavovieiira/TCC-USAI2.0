import { z } from 'zod';
import { senhaSchema } from '@/common/senha';

export const cadastroMoradorSchema = z.object({
  linkSlug: z.string().min(1, 'Link do condomínio é obrigatório').max(100),
  pin: z.string().min(4, 'PIN inválido').max(20),
  nome: z.string().trim().min(2, 'Nome é obrigatório').max(120),
  email: z.string().trim().max(254).email('E-mail inválido'),
  senha: senhaSchema,
  apartamento: z.string().max(30).optional(),
  /** LGPD: o aceite dos Termos de Uso e da Política de Privacidade é obrigatório para criar a conta. */
  aceiteTermos: z.literal(true, {
    error: 'Aceite os Termos de Uso e a Política de Privacidade para continuar',
  }),
});

export const loginSchema = z.object({
  email: z.string().trim().max(254).email('E-mail inválido'),
  senha: z.string().min(1, 'Senha é obrigatória').max(200),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token é obrigatório').max(2000),
});

export const atualizarPerfilSchema = z.object({
  nome: z.string().trim().min(2, 'Nome é obrigatório').max(120),
  apartamento: z.string().max(30).optional(),
  cpf: z.string().max(20).optional(),
});

export const esqueciSenhaSchema = z.object({
  email: z.string().trim().max(254).email('E-mail inválido'),
});

export const redefinirSenhaSchema = z.object({
  token: z.string().min(10, 'Link inválido').max(200),
  senha: senhaSchema,
});

export const definirSenhaSchema = z.object({
  token: z.string().min(10, 'Link inválido').max(200),
  senha: senhaSchema,
});
