import { Request, Response } from 'express';
import { ForbiddenError } from '@/common/errors';
import { prisma } from '@/common/prisma';
import { NotificacoesService } from '@/modules/notificacoes/notificacoes.service';
import { AsaasClient } from '@/modules/pagamentos/asaas.client';
import { assinaturaIdSchema, contratarSchema, renovacaoSchema } from './assinaturas.schemas';
import { AssinaturasService } from './assinaturas.service';

/** Instância compartilhada com o webhook do Asaas e com a conferência periódica (server.ts). */
export const assinaturasService = new AssinaturasService(
  prisma,
  new AsaasClient(),
  undefined,
  new NotificacoesService(prisma),
);

function condominioDoSindico(req: Request): string {
  if (!req.auth?.condominioId) {
    throw new ForbiddenError('Este perfil não está vinculado a um condomínio');
  }
  return req.auth.condominioId;
}

export const assinaturasController = {
  listarPlanos(_req: Request, res: Response) {
    res.status(200).json(assinaturasService.listarPlanos());
  },

  async contratar(req: Request, res: Response) {
    const input = contratarSchema.parse(req.body);
    const resultado = await assinaturasService.contratar(input);
    res.status(201).json(resultado);
  },

  async consultarStatus(req: Request, res: Response) {
    const { id } = assinaturaIdSchema.parse(req.params);
    res.status(200).json(await assinaturasService.consultarStatus(id));
  },

  async reenviarAcesso(req: Request, res: Response) {
    const { id } = assinaturaIdSchema.parse(req.params);
    await assinaturasService.reenviarAcesso(id);
    res.status(200).json({ ok: true });
  },

  async painel(req: Request, res: Response) {
    const painel = await assinaturasService.obterPainel(condominioDoSindico(req));
    res.status(200).json(painel);
  },

  async gerarCobranca(req: Request, res: Response) {
    const { periodoCodigo } = renovacaoSchema.parse(req.body ?? {});
    const resultado = await assinaturasService.gerarCobrancaRenovacao(
      condominioDoSindico(req),
      periodoCodigo,
    );
    res.status(201).json(resultado);
  },
};
