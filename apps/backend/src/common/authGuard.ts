import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Papel } from '@prisma/client';
import { segredosJwt } from './config';
import { AppError, UnauthorizedError, ForbiddenError } from './errors';

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
  return jwt.verify(token, segredosJwt().accessSecret, { algorithms: ['HS256'] }) as AuthPayload;
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
    // Código próprio: o front renova a sessão sozinho só neste caso (e não quando, por exemplo, a senha está errada).
    throw new AppError('Token inválido ou expirado', 401, 'TOKEN_INVALIDO');
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
