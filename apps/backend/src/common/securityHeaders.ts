import { NextFunction, Request, Response } from 'express';

/**
 * Cabeçalhos de segurança da API. Não usamos o `helmet` (uma dependência a menos para manter)
 * e deixamos de fora, de propósito, o `Cross-Origin-Resource-Policy`: as fotos de `/uploads` precisam
 * carregar no front, que fica em outra origem.
 *
 * - `nosniff`: o navegador não tenta adivinhar o tipo do arquivo (um upload nunca vira script).
 * - `X-Frame-Options: DENY` e `frame-ancestors 'none'`: a API não é aberta dentro de iframe de outro site.
 * - `Content-Security-Policy: default-src 'none'`: uma resposta da API não carrega nem executa nada se for
 *   aberta direto no navegador (a API só devolve JSON e imagens).
 * - `Referrer-Policy: no-referrer`: links e imagens não vazam o endereço de origem.
 * - `Permissions-Policy`: a API não precisa de câmera, microfone, localização nem pagamento.
 * - `Cross-Origin-Opener-Policy`: isola a janela da API de outras origens.
 * - HSTS só vale (e só é enviado) quando a requisição chegou por HTTPS; atrás de proxy, depende de `trust proxy`.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  );
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
}

/** As respostas de `/api` trazem dados pessoais e financeiros: nada disso pode ficar em cache do navegador ou de proxy. */
export function semCache(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'no-store');
  next();
}
