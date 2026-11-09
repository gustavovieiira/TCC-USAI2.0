import { z } from 'zod';
import { MENSAGEM_VALOR_MINIMO, VALOR_MINIMO_COBRANCA } from '@/common/valores';

const textoOpcional = z
  .string()
  .trim()
  .max(120, 'Máximo de 120 caracteres')
  .transform((valor) => (valor === '' ? undefined : valor))
  .optional();

/** Acessórios que acompanham o item, conferidos na retirada e na devolução. */
const acessoriosSchema = z
  .array(z.string().trim().min(1, 'Acessório vazio').max(80, 'Máximo de 80 caracteres'))
  .max(30, 'No máximo 30 acessórios');

const tipoAnuncio = z.enum(['ITEM', 'SERVICO']);
const unidadeCobranca = z.enum(['DIA', 'HORA', 'SERVICO']);

const imagensSchema = z
  .array(
    z
      .string()
      .url('URL de imagem inválida')
      .max(500)
      // Só imagens enviadas pela própria API (/uploads/itens/...): um link de fora serviria para rastrear quem abre o anúncio.
      .refine((url) => {
        try {
          return new URL(url).pathname.startsWith('/uploads/itens/');
        } catch {
          return false;
        }
      }, 'A imagem precisa ser enviada pela própria plataforma'),
  )
  .max(10);

/**
 * Anúncio do catálogo. Um ITEM é alugado por dia (valor mínimo de R$ 5,00, o menor que o PIX aceita). Um SERVIÇO é
 * combinado direto entre os moradores, por hora ou por serviço, sem pagamento pela plataforma, então não tem piso.
 */
export const criarItemSchema = z
  .object({
    tipo: tipoAnuncio.default('ITEM'),
    unidadeCobranca: unidadeCobranca.optional(),
    titulo: z.string().min(3, 'Título deve ter ao menos 3 caracteres').max(120),
    descricao: z.string().min(10, 'Descrição deve ter ao menos 10 caracteres').max(5000),
    categoria: z.string().min(2, 'Categoria é obrigatória').max(60),
    valorDiaria: z.number().positive('Informe um valor maior que zero').max(1_000_000),
    fabricante: textoOpcional,
    modelo: textoOpcional,
    numeroSerie: textoOpcional,
    acessorios: acessoriosSchema.optional(),
    imagens: imagensSchema.optional(),
  })
  .superRefine((dados, ctx) => {
    if (dados.tipo === 'ITEM') {
      if (dados.valorDiaria < VALOR_MINIMO_COBRANCA) {
        ctx.addIssue({ code: 'custom', path: ['valorDiaria'], message: MENSAGEM_VALOR_MINIMO });
      }
      if (dados.unidadeCobranca && dados.unidadeCobranca !== 'DIA') {
        ctx.addIssue({
          code: 'custom',
          path: ['unidadeCobranca'],
          message: 'Um item é cobrado por dia',
        });
      }
      return;
    }

    if (dados.unidadeCobranca !== 'HORA' && dados.unidadeCobranca !== 'SERVICO') {
      ctx.addIssue({
        code: 'custom',
        path: ['unidadeCobranca'],
        message: 'Informe se o serviço é cobrado por hora ou por serviço',
      });
    }
  })
  .transform((dados) => {
    if (dados.tipo === 'SERVICO') {
      // Identificação de bem (fabricante, modelo, série e acessórios) só faz sentido para item.
      return {
        ...dados,
        fabricante: undefined,
        modelo: undefined,
        numeroSerie: undefined,
        acessorios: undefined,
      };
    }
    return { ...dados, unidadeCobranca: 'DIA' as const };
  });

export const atualizarItemSchema = z
  .object({
    titulo: z.string().min(3).max(120).optional(),
    descricao: z.string().min(10).optional(),
    categoria: z.string().min(2).optional(),
    // O piso de R$ 5,00 vale só para item; o serviço confere isso no serviço (ver `ItensService#atualizar`).
    valorDiaria: z.number().positive('Informe um valor maior que zero').max(1_000_000).optional(),
    unidadeCobranca: unidadeCobranca.optional(),
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
  tipo: tipoAnuncio.optional(),
});
