import { Request, Response } from 'express';
import { prisma } from '@/common/prisma';
import { ForbiddenError } from '@/common/errors';
import { ConversasService } from './conversas.service';
import { abrirConversaSchema, enviarMensagemPrivadaSchema } from './conversas.schemas';

const conversasService = new ConversasService(prisma);

function condominioDoUsuario(req: Request): string {
  if (!req.auth?.condominioId) {
    throw new ForbiddenError('Este perfil não está vinculado a um condomínio');
  }
  return req.auth.condominioId;
}

export const conversasController = {
  async abrir(req: Request, res: Response) {
    const input = abrirConversaSchema.parse(req.body);
    const condominioId = condominioDoUsuario(req);
    const conversa = await conversasService.abrirOuContinuar(condominioId, req.auth!.userId, input);
    res.status(201).json(conversa);
  },

  async listarUsuarios(req: Request, res: Response) {
    const condominioId = condominioDoUsuario(req);
    const usuarios = await conversasService.listarUsuariosDoCondominio(
      condominioId,
      req.auth!.userId,
    );
    res.status(200).json(usuarios);
  },

  async listarMinhas(req: Request, res: Response) {
    const condominioId = condominioDoUsuario(req);
    const conversas = await conversasService.listarMinhas(condominioId, req.auth!.userId);
    res.status(200).json(conversas);
  },

  async buscarPorId(req: Request, res: Response) {
    const condominioId = condominioDoUsuario(req);
    const conversa = await conversasService.buscarPorId(
      req.params.id,
      condominioId,
      req.auth!.userId,
    );
    res.status(200).json(conversa);
  },

  async listarMensagens(req: Request, res: Response) {
    const condominioId = condominioDoUsuario(req);
    const mensagens = await conversasService.listarMensagens(
      req.params.id,
      condominioId,
      req.auth!.userId,
    );
    res.status(200).json(mensagens);
  },

  async enviarMensagem(req: Request, res: Response) {
    const input = enviarMensagemPrivadaSchema.parse(req.body);
    const condominioId = condominioDoUsuario(req);
    const mensagem = await conversasService.enviarMensagem(
      req.params.id,
      condominioId,
      req.auth!.userId,
      input,
    );
    res.status(201).json(mensagem);
  },
};
