import { Request, Response } from 'express';
import { prisma } from '@/common/prisma';
import { SaquesService } from '@/modules/saques/saques.service';
import { AdminService } from './admin.service';
import {
  atualizarCondominioSchema,
  criarCondominioSchema,
  criarSindicoSchema,
  listarCondominiosQuerySchema,
} from './admin.schemas';

const adminService = new AdminService(prisma);
const saquesService = new SaquesService(prisma);

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

  /** Busca de usuários (nome ou e-mail) pra abrir o extrato de qualquer um. */
  async listarUsuarios(req: Request, res: Response) {
    const busca = typeof req.query.busca === 'string' ? req.query.busca : undefined;
    const usuarios = await adminService.listarUsuarios(busca);
    res.status(200).json(usuarios);
  },

  /** Extrato completo de qualquer usuário (auditoria/suporte); chave PIX sem máscara. */
  async extratoDoUsuario(req: Request, res: Response) {
    const usuario = await adminService.buscarUsuarioOuFalhar(req.params.id);
    const extrato = await saquesService.extrato(usuario.id, { revelarChavePix: true });
    res.status(200).json({ usuario, extrato });
  },

  async extratoPlataforma(_req: Request, res: Response) {
    const extrato = await adminService.extratoPlataforma();
    res.status(200).json(extrato);
  },

  async resumoFinanceiro(_req: Request, res: Response) {
    const resumo = await adminService.resumoFinanceiro();
    res.status(200).json(resumo);
  },
};
