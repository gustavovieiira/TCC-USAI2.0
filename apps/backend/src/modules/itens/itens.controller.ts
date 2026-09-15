import { Request, Response } from 'express';
import { prisma } from '@/common/prisma';
import { ForbiddenError } from '@/common/errors';
import { ItensService } from './itens.service';
import { atualizarItemSchema, criarItemSchema, listarItensQuerySchema } from './itens.schemas';

const itensService = new ItensService(prisma);

function condominioDoUsuario(req: Request): string {
  if (!req.auth?.condominioId) {
    throw new ForbiddenError('Este perfil não está vinculado a um condomínio');
  }
  return req.auth.condominioId;
}

export const itensController = {
  async criar(req: Request, res: Response) {
    const input = criarItemSchema.parse(req.body);
    const condominioId = condominioDoUsuario(req);
    const item = await itensService.criar(condominioId, req.auth!.userId, input);
    res.status(201).json(item);
  },

  async listar(req: Request, res: Response) {
    const filtro = listarItensQuerySchema.parse(req.query);
    const condominioId = condominioDoUsuario(req);
    const itens = await itensService.listarPorCondominio(condominioId, filtro);
    res.status(200).json(itens);
  },

  async buscarPorId(req: Request, res: Response) {
    const condominioId = condominioDoUsuario(req);
    const item = await itensService.buscarPorId(req.params.id, condominioId);
    res.status(200).json(item);
  },

  async atualizar(req: Request, res: Response) {
    const input = atualizarItemSchema.parse(req.body);
    const item = await itensService.atualizar(req.params.id, req.auth!.userId, input);
    res.status(200).json(item);
  },

  async remover(req: Request, res: Response) {
    await itensService.remover(req.params.id, req.auth!.userId);
    res.status(204).send();
  },
};
