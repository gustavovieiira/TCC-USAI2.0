import { Request, Response } from 'express';
import { prisma } from '@/common/prisma';
import { criarDespesaSchema, vendasQuerySchema } from './plataforma.schemas';
import { PlataformaService } from './plataforma.service';

const plataformaService = new PlataformaService(prisma);

/** Financeiro das vendas da plataforma (mensalidades dos síndicos). As rotas ficam atrás do `requireRole('ADMIN')`. */
export const plataformaController = {
  async vendasDoMes(req: Request, res: Response) {
    const { mes } = vendasQuerySchema.parse(req.query);
    res.status(200).json(await plataformaService.vendasDoMes(mes));
  },

  async listarAssinaturas(_req: Request, res: Response) {
    res.status(200).json(await plataformaService.listarAssinaturas());
  },

  async criarDespesa(req: Request, res: Response) {
    const input = criarDespesaSchema.parse(req.body);
    res.status(201).json(await plataformaService.criarDespesa(input, req.auth!.userId));
  },

  async removerDespesa(req: Request, res: Response) {
    await plataformaService.removerDespesa(req.params.id);
    res.status(204).send();
  },
};
