import { z } from 'zod';

export const atualizarTextosSchema = z.object({
  nomeInstitucional: z.string().trim().min(2, 'Informe o nome da empresa').max(120),
  rodapeInstitucional: z.string().trim().min(2, 'Informe o rodapé institucional').max(500),
});
