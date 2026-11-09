import { z } from 'zod';

export const criarPostSchema = z.object({
  conteudo: z.string().min(3, 'Escreva ao menos 3 caracteres').max(2000),
  tipo: z.enum(['PEDIDO', 'AVISO']).default('PEDIDO'),
  categoria: z.string().min(2).optional(),
  // Até 4 fotos, só as enviadas pela própria API (/uploads/mural/...): um link de fora serviria para rastrear quem abre o post.
  imagens: z
    .array(
      z
        .string()
        .url('URL de imagem inválida')
        .max(500)
        .refine((url) => {
          try {
            return new URL(url).pathname.startsWith('/uploads/mural/');
          } catch {
            return false;
          }
        }, 'A imagem precisa ser enviada pela própria plataforma'),
    )
    .max(4, 'No máximo 4 fotos por post')
    .optional(),
  condominioId: z.string().uuid().optional(),
});

export const responderPostSchema = z.object({
  conteudo: z.string().min(1, 'Resposta não pode ser vazia').max(2000),
});
