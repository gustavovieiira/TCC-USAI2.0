import { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from './errors';

interface OpcoesLimite {
  /** Máximo de requisições por janela, por IP. */
  max: number;
  janelaMs: number;
  mensagem?: string;
  /** Por padrão o limitador não age nos testes automatizados; o teste dele próprio liga isto. */
  ativoEmTeste?: boolean;
}

/**
 * Limitador simples em memória (por IP) pras rotas públicas que criam coisas (cadastro de
 * condomínio gera cliente e cobrança no Asaas). Suficiente pra uma instância só; atrás de um proxy
 * é preciso `app.set('trust proxy', ...)` pro IP real aparecer. Desligado nos testes automatizados.
 */
export function criarLimitador({
  max,
  janelaMs,
  mensagem,
  ativoEmTeste = false,
}: OpcoesLimite): RequestHandler {
  const tentativas = new Map<string, number[]>();

  return (req: Request, _res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'test' && !ativoEmTeste) return next();

    const agora = Date.now();
    const ip = req.ip ?? 'desconhecido';
    const recentes = (tentativas.get(ip) ?? []).filter((t) => agora - t < janelaMs);

    if (recentes.length >= max) {
      return next(
        new AppError(
          mensagem ?? 'Muitas tentativas. Aguarde um pouco e tente de novo.',
          429,
          'TOO_MANY_REQUESTS',
        ),
      );
    }

    recentes.push(agora);
    tentativas.set(ip, recentes);
    return next();
  };
}
