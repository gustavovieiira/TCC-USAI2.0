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

  logger.error('Unhandled error', { error: err, path: req.path });
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno' } });
}
