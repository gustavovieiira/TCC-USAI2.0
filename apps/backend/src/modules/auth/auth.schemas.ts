import { z } from 'zod';

export const cadastroMoradorSchema = z.object({
  linkSlug: z.string().min(1, 'Link do condomínio é obrigatório'),
  pin: z.string().min(4, 'PIN inválido'),
  nome: z.string().min(2, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
  apartamento: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'Senha é obrigatória'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
});
