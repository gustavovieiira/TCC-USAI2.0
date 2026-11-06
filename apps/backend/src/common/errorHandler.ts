import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from './errors';
import { logger } from './logger';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos', details: err.flatten() },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
  }

  // Erros do próprio Express/body-parser (JSON malformado, corpo grande demais...) trazem o status certo.
  const status = (err as { status?: unknown } | null)?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    const mensagem =
      status === 413
        ? 'Requisição grande demais'
        : 'Requisição inválida: confira o formato dos dados';
    return res.status(status).json({ error: { code: 'BAD_REQUEST', message: mensagem } });
  }

  logger.error('Unhandled error', { error: err, path: req.path });
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno' } });
}
