import { Request, Response } from 'express';
import { prisma } from '@/common/prisma';
import { NotificacoesService } from './notificacoes.service';

const notificacoesService = new NotificacoesService(prisma);

export const notificacoesController = {
  async listar(req: Request, res: Response) {
    const lista = await notificacoesService.listar(req.auth!.userId);
    res.status(200).json(lista);
  },

  async marcarComoLida(req: Request, res: Response) {
    await notificacoesService.marcarComoLida(req.params.id, req.auth!.userId);
    res.status(204).send();
  },

  async marcarTodasComoLidas(req: Request, res: Response) {
    await notificacoesService.marcarTodasComoLidas(req.auth!.userId);
    res.status(204).send();
  },
};
