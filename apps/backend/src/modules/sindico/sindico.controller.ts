import { Request, Response } from 'express';
import { prisma } from '@/common/prisma';
import { ForbiddenError } from '@/common/errors';
import { SindicoService } from './sindico.service';
import { atualizarPinSchema } from './sindico.schemas';

const sindicoService = new SindicoService(prisma);

function condominioDoSindico(req: Request): string {
  if (!req.auth?.condominioId) {
    throw new ForbiddenError('Este perfil não está vinculado a um condomínio');
  }
  return req.auth.condominioId;
}

export const sindicoController = {
  async buscarCondominio(req: Request, res: Response) {
    const condominio = await sindicoService.buscarCondominio(condominioDoSindico(req));
    res.status(200).json(condominio);
  },

  async atualizarPin(req: Request, res: Response) {
    const input = atualizarPinSchema.parse(req.body);
    const condominio = await sindicoService.atualizarPin(condominioDoSindico(req), input);
    res.status(200).json(condominio);
  },

  async listarMoradores(req: Request, res: Response) {
    const moradores = await sindicoService.listarMoradores(condominioDoSindico(req));
    res.status(200).json(moradores);
  },

  async listarLocacoesAtivas(req: Request, res: Response) {
    const locacoes = await sindicoService.listarLocacoesAtivas(condominioDoSindico(req));
    res.status(200).json(locacoes);
  },
};
