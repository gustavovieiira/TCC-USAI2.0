import { Request, Response } from 'express';
import { prisma } from '@/common/prisma';
import { SaquesService } from './saques.service';
import {
  listarSaquesQuerySchema,
  rejeitarSaqueSchema,
  solicitarSaqueSchema,
} from './saques.schemas';

const saquesService = new SaquesService(prisma);

export const saquesController = {
  async solicitar(req: Request, res: Response) {
    const input = solicitarSaqueSchema.parse(req.body);
    const saque = await saquesService.solicitar(req.auth!.userId, input);
    res.status(201).json(saque);
  },

  async listarMinhas(req: Request, res: Response) {
    const saques = await saquesService.listarPorUsuario(req.auth!.userId);
    res.status(200).json(saques);
  },

  async saldo(req: Request, res: Response) {
    const saldo = await saquesService.calcularSaldo(req.auth!.userId);
    res.status(200).json({ saldo });
  },

  async listarTodas(req: Request, res: Response) {
    const filtro = listarSaquesQuerySchema.parse(req.query);
    const saques = await saquesService.listarTodas(filtro);
    res.status(200).json(saques);
  },

  async aprovar(req: Request, res: Response) {
    const saque = await saquesService.aprovar(req.params.id, req.auth!.userId);
    res.status(200).json(saque);
  },

  async rejeitar(req: Request, res: Response) {
    const input = rejeitarSaqueSchema.parse(req.body);
    const saque = await saquesService.rejeitar(req.params.id, req.auth!.userId, input);
    res.status(200).json(saque);
  },
};
