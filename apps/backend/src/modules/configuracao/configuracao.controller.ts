import { Request, Response } from 'express';
import { prisma } from '@/common/prisma';
import { AppError } from '@/common/errors';
import { ConfiguracaoService } from './configuracao.service';
import { atualizarTextosSchema } from './configuracao.schemas';
import { MARCA_UPLOADS_DIR, uploadLogo } from './upload.middleware';

const configuracaoService = new ConfiguracaoService(prisma, MARCA_UPLOADS_DIR);

function processarUpload(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    uploadLogo(req, res, (err: unknown) => (err ? reject(err) : resolve()));
  });
}

export const configuracaoController = {
  /** Pública: o cabeçalho, a tela inicial e o login precisam da logo antes de qualquer login. */
  async obter(_req: Request, res: Response) {
    res.status(200).json(await configuracaoService.obter());
  },

  async enviarLogo(req: Request, res: Response) {
    try {
      await processarUpload(req, res);
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Falha no upload da logo';
      throw new AppError(mensagem, 400, 'UPLOAD_INVALIDO');
    }

    if (!req.file) {
      throw new AppError('Nenhuma imagem enviada', 400, 'UPLOAD_AUSENTE');
    }

    const url = `${req.protocol}://${req.get('host')}/uploads/marca/${req.file.filename}`;
    res.status(200).json(await configuracaoService.definirLogo(url, req.auth!.userId));
  },

  async removerLogo(req: Request, res: Response) {
    res.status(200).json(await configuracaoService.removerLogo(req.auth!.userId));
  },

  async atualizarTextos(req: Request, res: Response) {
    const input = atualizarTextosSchema.parse(req.body);
    res.status(200).json(await configuracaoService.atualizarTextos(input, req.auth!.userId));
  },
};
