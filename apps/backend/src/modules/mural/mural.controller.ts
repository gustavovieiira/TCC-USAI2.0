import { Request, Response } from 'express';
import { prisma } from '@/common/prisma';
import { ForbiddenError } from '@/common/errors';
import { MuralService } from './mural.service';
import { criarPostSchema, responderPostSchema } from './mural.schemas';

const muralService = new MuralService(prisma);

function condominioDoUsuario(req: Request): string {
  if (!req.auth?.condominioId) {
    throw new ForbiddenError('Este perfil não está vinculado a um condomínio');
  }
  return req.auth.condominioId;
}

export const muralController = {
  async criar(req: Request, res: Response) {
    const input = criarPostSchema.parse(req.body);
    const post = await muralService.criarPost(req.auth!.condominioId, req.auth!.userId, input);
    res.status(201).json(post);
  },

  async listar(req: Request, res: Response) {
    const condominioId = condominioDoUsuario(req);
    const posts = await muralService.listarPorCondominio(condominioId);
    res.status(200).json(posts);
  },

  async buscarPorId(req: Request, res: Response) {
    const condominioId = condominioDoUsuario(req);
    const post = await muralService.buscarPorId(req.params.id, condominioId);
    res.status(200).json(post);
  },

  async responder(req: Request, res: Response) {
    const input = responderPostSchema.parse(req.body);
    const condominioId = condominioDoUsuario(req);
    const comentario = await muralService.responder(
      req.params.id,
      condominioId,
      req.auth!.userId,
      input,
    );
    res.status(201).json(comentario);
  },

  async marcarAtendido(req: Request, res: Response) {
    const condominioId = condominioDoUsuario(req);
    const post = await muralService.marcarAtendido(req.params.id, condominioId, req.auth!.userId);
    res.status(200).json(post);
  },

  async excluir(req: Request, res: Response) {
    const condominioId = condominioDoUsuario(req);
    await muralService.excluir(req.params.id, condominioId, req.auth!.userId, req.auth!.papel);
    res.status(204).send();
  },
};
