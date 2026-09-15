import { z } from 'zod';

export const atualizarPinSchema = z.object({
  pin: z.string().regex(/^\d{4,8}$/, 'PIN deve conter apenas dígitos (4 a 8 caracteres)'),
});
