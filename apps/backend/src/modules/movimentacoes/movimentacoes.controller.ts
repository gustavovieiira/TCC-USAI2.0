import { Request, Response } from 'express';
import { prisma } from '@/common/prisma';
import { NotificacoesService } from '@/modules/notificacoes/notificacoes.service';
import { MovimentacoesService } from './movimentacoes.service';
import { TermosService } from './termos.service';
import {
  aceitarMovimentacaoSchema,
  criarTermoSchema,
  registrarMovimentacaoSchema,
  retificarMovimentacaoSchema,
  tipoMovimentacaoSchema,
} from './movimentacoes.schemas';

const movimentacoesService = new MovimentacoesService(prisma, new NotificacoesService(prisma));
const termosService = new TermosService(prisma);

export const movimentacoesController = {
  async termoVigente(req: Request, res: Response) {
    const tipo = tipoMovimentacaoSchema.parse(String(req.params.tipo).toUpperCase());
    res.status(200).json(await movimentacoesService.termoVigente(tipo));
  },

  async listarPorLocacao(req: Request, res: Response) {
    const lista = await movimentacoesService.listarPorLocacao(
      req.params.id,
      req.auth!.userId,
      req.auth!.papel,
    );
    res.status(200).json(lista);
  },

  async registrar(req: Request, res: Response) {
    const input = registrarMovimentacaoSchema.parse(req.body);
    const mov = await movimentacoesService.registrar(req.params.id, req.auth!.userId, input);
    res.status(201).json(mov);
  },

  async detalhe(req: Request, res: Response) {
    const detalhe = await movimentacoesService.buscarDetalhe(
      req.params.id,
      req.auth!.userId,
      req.auth!.papel,
    );
    res.status(200).json(detalhe);
  },

  async aceitar(req: Request, res: Response) {
    const input = aceitarMovimentacaoSchema.parse(req.body);
    const detalhe = await movimentacoesService.aceitar(req.params.id, req.auth!.userId, input, {
      ip: req.ip,
      userAgent: req.get('user-agent') ?? undefined,
    });
    res.status(200).json(detalhe);
  },

  async cancelar(req: Request, res: Response) {
    res.status(200).json(await movimentacoesService.cancelar(req.params.id, req.auth!.userId));
  },

  async retificar(req: Request, res: Response) {
    const { texto } = retificarMovimentacaoSchema.parse(req.body);
    const detalhe = await movimentacoesService.retificar(req.params.id, req.auth!.userId, texto);
    res.status(201).json(detalhe);
  },

  /** Admin: documentos recentes de toda a plataforma (auditoria). */
  async listarRecentes(_req: Request, res: Response) {
    res.status(200).json(await movimentacoesService.listarRecentes());
  },

  async listarTermos(_req: Request, res: Response) {
    res.status(200).json(await termosService.listar());
  },

  async criarTermo(req: Request, res: Response) {
    const input = criarTermoSchema.parse(req.body);
    res.status(201).json(await termosService.criarNovaVersao(req.auth!.userId, input));
  },

  async aprovarTermo(req: Request, res: Response) {
    res.status(200).json(await termosService.aprovar(req.params.id, req.auth!.userId));
  },
};
