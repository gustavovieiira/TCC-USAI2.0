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

interface OpcoesLimiteDeFalhas {
  /** Quantas respostas de falha (`falhou`) cada chave aguenta dentro da janela. */
  max: number;
  janelaMs: number;
  /** Quem está sendo contado: o IP, o e-mail tentado, o condomínio do cadastro... */
  chave: (req: Request) => string | undefined;
  /** Que respostas contam como falha (por padrão, as de "não autorizado" e "não encontrado"). */
  falhou?: (status: number) => boolean;
  /** Zera a contagem quando a requisição dá certo (use na chave do e-mail, nunca na do IP). */
  zeraNoSucesso?: boolean;
  mensagem?: string;
  ativoEmTeste?: boolean;
}

const TAMANHO_MAXIMO_DO_MAPA = 20_000;

/**
 * Limitador de tentativas que erram, contra adivinhar senha e PIN. Diferente do `criarLimitador`, só as
 * respostas de falha entram na conta: quem acerta de primeira nunca é barrado. Em memória, como o outro.
 */
export function limitarFalhas({
  max,
  janelaMs,
  chave,
  falhou = (status) => status === 401 || status === 404,
  zeraNoSucesso = false,
  mensagem,
  ativoEmTeste = false,
}: OpcoesLimiteDeFalhas): RequestHandler {
  const falhas = new Map<string, number[]>();

  function recentes(alvo: string, agora: number): number[] {
    return (falhas.get(alvo) ?? []).filter((t) => agora - t < janelaMs);
  }

  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'test' && !ativoEmTeste) return next();

    const alvo = chave(req);
    if (!alvo) return next();

    const agora = Date.now();
    if (recentes(alvo, agora).length >= max) {
      return next(
        new AppError(
          mensagem ?? 'Muitas tentativas. Aguarde um pouco e tente de novo.',
          429,
          'TOO_MANY_REQUESTS',
        ),
      );
    }

    res.on('finish', () => {
      const depois = Date.now();
      if (falhou(res.statusCode)) {
        const lista = recentes(alvo, depois);
        lista.push(depois);
        falhas.set(alvo, lista);

        if (falhas.size > TAMANHO_MAXIMO_DO_MAPA) {
          for (const [k, v] of falhas) {
            if (v.every((t) => depois - t >= janelaMs)) falhas.delete(k);
          }
        }
      } else if (zeraNoSucesso && res.statusCode < 400) {
        falhas.delete(alvo);
      }
    });

    return next();
  };
}
