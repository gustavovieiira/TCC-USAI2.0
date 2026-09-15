import { Request, Response } from 'express';
import { prisma } from '@/common/prisma';
import { AdminService } from './admin.service';
import {
  atualizarCondominioSchema,
  criarCondominioSchema,
  criarSindicoSchema,
  listarCondominiosQuerySchema,
} from './admin.schemas';

const adminService = new AdminService(prisma);

export const adminController = {
  async criarCondominio(req: Request, res: Response) {
    const input = criarCondominioSchema.parse(req.body);
    const condominio = await adminService.criarCondominio(input);
    res.status(201).json(condominio);
  },

  async listarCondominios(req: Request, res: Response) {
    const filtro = listarCondominiosQuerySchema.parse(req.query);
    const condominios = await adminService.listarCondominios(filtro);
    res.status(200).json(condominios);
  },

  async atualizarCondominio(req: Request, res: Response) {
    const input = atualizarCondominioSchema.parse(req.body);
    const condominio = await adminService.atualizarCondominio(req.params.id, input);
    res.status(200).json(condominio);
  },

  async criarSindico(req: Request, res: Response) {
    const input = criarSindicoSchema.parse(req.body);
    const sindico = await adminService.criarSindico(input);
    res.status(201).json(sindico);
  },

  async resumoFinanceiro(_req: Request, res: Response) {
    const resumo = await adminService.resumoFinanceiro();
    res.status(200).json(resumo);
  },
};
