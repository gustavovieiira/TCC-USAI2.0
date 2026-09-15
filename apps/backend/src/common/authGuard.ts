import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Papel } from '@prisma/client';
import { UnauthorizedError, ForbiddenError } from './errors';

export interface AuthPayload {
  userId: string;
  papel: Papel;
  condominioId: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

/** Compartilhado com o servidor de WebSocket (`realtime/socket.ts`), que autentica fora do ciclo HTTP. */
export function verifyAccessToken(token: string): AuthPayload {
  const secret = process.env.JWT_ACCESS_SECRET ?? 'dev-secret';
  return jwt.verify(token, secret) as AuthPayload;
}

export function authGuard(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token de acesso ausente');
  }

  const token = header.substring('Bearer '.length);

  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    throw new UnauthorizedError('Token inválido ou expirado');
  }
}

export function requireRole(...papeis: Papel[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth || !papeis.includes(req.auth.papel)) {
      throw new ForbiddenError('Perfil sem permissão para esta ação');
    }
    next();
  };
}
