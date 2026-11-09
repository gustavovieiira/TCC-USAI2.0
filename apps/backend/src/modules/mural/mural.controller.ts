import { Request, Response } from 'express';
import { prisma } from '@/common/prisma';
import { NotificacoesService } from '@/modules/notificacoes/notificacoes.service';
import { AppError, ForbiddenError } from '@/common/errors';
import { garantirImagemReal } from '@/common/imagem';
import { MuralService } from './mural.service';
import { criarPostSchema, responderPostSchema } from './mural.schemas';
import { uploadImagemPost } from './upload.middleware';

const muralService = new MuralService(prisma, new NotificacoesService(prisma));

function condominioDoUsuario(req: Request): string {
  if (!req.auth?.condominioId) {
    throw new ForbiddenError('Este perfil não está vinculado a um condomínio');
  }
  return req.auth.condominioId;
}

/** Promisifica o middleware do multer para tratar o erro dele como um AppError normal. */
function processarUpload(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    uploadImagemPost(req, res, (err: unknown) =>
      err ? reject(err instanceof Error ? err : new Error(String(err))) : resolve(),
    );
  });
}

export const muralController = {
  /** Envia uma foto e devolve o endereço dela, para ser anexado ao post na hora de publicar. */
  async uploadImagem(req: Request, res: Response) {
    try {
      await processarUpload(req, res);
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Falha no upload da imagem';
      throw new AppError(mensagem, 400, 'UPLOAD_INVALIDO');
    }

    if (!req.file) {
      throw new AppError('Nenhuma imagem enviada', 400, 'UPLOAD_AUSENTE');
    }

    await garantirImagemReal(req.file.path);

    const url = `${req.protocol}://${req.get('host')}/uploads/mural/${req.file.filename}`;
    res.status(201).json({ url });
  },

  async criar(req: Request, res: Response) {
    const input = criarPostSchema.parse(req.body);
    const post = await muralService.criarPost(req.auth!.condominioId, req.auth!.userId, input);
    res.status(201).json(post);
  },

  async listar(req: Request, res: Response) {
    const condominioId = condominioDoUsuario(req);
    const posts = await muralService.listarPorCondominio(condominioId);
    res.status(200).json(posts);
  },

  async buscarPorId(req: Request, res: Response) {
    const condominioId = condominioDoUsuario(req);
    const post = await muralService.buscarPorId(req.params.id, condominioId);
    res.status(200).json(post);
  },

  async responder(req: Request, res: Response) {
    const input = responderPostSchema.parse(req.body);
    const condominioId = condominioDoUsuario(req);
    const comentario = await muralService.responder(
      req.params.id,
      condominioId,
      req.auth!.userId,
      input,
    );
    res.status(201).json(comentario);
  },

  async marcarAtendido(req: Request, res: Response) {
    const condominioId = condominioDoUsuario(req);
    const post = await muralService.marcarAtendido(req.params.id, condominioId, req.auth!.userId);
    res.status(200).json(post);
  },

  async excluir(req: Request, res: Response) {
    const condominioId = condominioDoUsuario(req);
    await muralService.excluir(req.params.id, condominioId, req.auth!.userId, req.auth!.papel);
    res.status(204).send();
  },
};
