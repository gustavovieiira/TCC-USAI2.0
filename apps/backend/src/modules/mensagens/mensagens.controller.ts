import { Request, Response } from 'express';
import { prisma } from '@/common/prisma';
import { MensagensService } from './mensagens.service';
import { enviarMensagemSchema } from './mensagens.schemas';

const mensagensService = new MensagensService(prisma);

export const mensagensController = {
  async enviar(req: Request, res: Response) {
    const input = enviarMensagemSchema.parse(req.body);
    const mensagem = await mensagensService.enviar(req.params.id, req.auth!.userId, input);
    res.status(201).json(mensagem);
  },

  async listar(req: Request, res: Response) {
    const mensagens = await mensagensService.listarPorLocacao(req.params.id, req.auth!.userId);
    res.status(200).json(mensagens);
  },
};
