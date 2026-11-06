import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@/common/prisma';
import { PrivacidadeService } from './privacidade.service';

const privacidadeService = new PrivacidadeService(prisma);

const excluirContaSchema = z.object({
  senha: z.string().min(1, 'Informe a sua senha').max(200),
  confirmacao: z.literal('EXCLUIR', {
    error: 'Digite EXCLUIR para confirmar',
  }),
});

export const privacidadeController = {
  /** Devolve os dados como arquivo para baixar (`Content-Disposition`), em JSON legível. */
  async meusDados(req: Request, res: Response) {
    const dados = await privacidadeService.exportarDados(req.auth!.userId);
    res.setHeader('Content-Disposition', 'attachment; filename="meus-dados-usai.json"');
    res.type('application/json').send(JSON.stringify(dados, null, 2));
  },

  async excluirConta(req: Request, res: Response) {
    const { senha } = excluirContaSchema.parse(req.body);
    await privacidadeService.excluirConta(req.auth!.userId, senha);
    res.status(204).end();
  },
};
