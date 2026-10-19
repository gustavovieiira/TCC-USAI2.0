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
    const condominioId = condominioDoUsuario(req);
    const input = abrirConversaSchema.parse(req.body);
    const conversa = await conversasService.abrirOuContinuar(condominioId, req.auth!.userId, input);
    res.status(201).json(conversa);
  },

  /** Abre o chat da locação (criando na primeira vez); só locatário e dono da locação. */
  async abrirPorLocacao(req: Request, res: Response) {
    const condominioId = condominioDoUsuario(req);
    const conversa = await conversasService.abrirPorLocacao(
      condominioId,
      req.auth!.userId,
      req.params.locacaoId,
    );
    res.status(200).json(conversa);
  },

  async contarNaoLidas(req: Request, res: Response) {
    const condominioId = condominioDoUsuario(req);
    const total = await conversasService.contarNaoLidas(condominioId, req.auth!.userId);
    res.status(200).json({ total });
  },

  async marcarComoLida(req: Request, res: Response) {
    const condominioId = condominioDoUsuario(req);
    await conversasService.marcarComoLida(req.params.id, condominioId, req.auth!.userId);
    res.status(204).send();
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
    const condominioId = condominioDoUsuario(req);
    const input = enviarMensagemPrivadaSchema.parse(req.body);
    const mensagem = await conversasService.enviarMensagem(
      req.params.id,
      condominioId,
      req.auth!.userId,
      input,
    );
    res.status(201).json(mensagem);
  },
};
