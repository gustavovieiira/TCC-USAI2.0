import { Request, Response } from 'express';
import { prisma } from '@/common/prisma';
import { ForbiddenError } from '@/common/errors';
import { LocacoesService } from './locacoes.service';
import { criarLocacaoSchema } from './locacoes.schemas';

const locacoesService = new LocacoesService(prisma);

function condominioDoUsuario(req: Request): string {
  if (!req.auth?.condominioId) {
    throw new ForbiddenError('Este perfil não está vinculado a um condomínio');
  }
  return req.auth.condominioId;
}

export const locacoesController = {
  async solicitar(req: Request, res: Response) {
    const input = criarLocacaoSchema.parse(req.body);
    const condominioId = condominioDoUsuario(req);
    const locacao = await locacoesService.solicitar(condominioId, req.auth!.userId, input);
    res.status(201).json(locacao);
  },

  async aprovar(req: Request, res: Response) {
    const locacao = await locacoesService.aprovar(req.params.id, req.auth!.userId);
    res.status(200).json(locacao);
  },

  async rejeitar(req: Request, res: Response) {
    const locacao = await locacoesService.rejeitar(req.params.id, req.auth!.userId);
    res.status(200).json(locacao);
  },

  async listarComoLocatario(req: Request, res: Response) {
    const condominioId = condominioDoUsuario(req);
    const locacoes = await locacoesService.listarComoLocatario(condominioId, req.auth!.userId);
    res.status(200).json(locacoes);
  },

  async listarComoProprietario(req: Request, res: Response) {
    const condominioId = condominioDoUsuario(req);
    const locacoes = await locacoesService.listarComoProprietario(condominioId, req.auth!.userId);
    res.status(200).json(locacoes);
  },
};
