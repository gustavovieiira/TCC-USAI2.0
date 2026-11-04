import { NextFunction, Request, Response } from 'express';

/**
 * Cabeçalhos de segurança básicos para a API. Não usamos o `helmet` (uma dependência a menos para manter)
 * e deixamos de fora, de propósito, o `Cross-Origin-Resource-Policy`: as fotos de `/uploads` precisam
 * carregar no front, que fica em outra origem.
 *
 * - `nosniff`: o navegador não tenta adivinhar o tipo do arquivo (um upload nunca vira script).
 * - `X-Frame-Options: DENY`: a API não é aberta dentro de iframe de outro site.
 * - `Referrer-Policy: no-referrer`: links e imagens não vazam o endereço de origem.
 * - HSTS só vale (e só é enviado) quando a requisição chegou por HTTPS; atrás de proxy, depende de `trust proxy`.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
}
