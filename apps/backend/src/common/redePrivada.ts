import { NextFunction, Request, Response } from 'express';

/** Endereço de rede interna: o próprio servidor, a rede do Docker ou uma rede privada. */
export function ehEnderecoPrivado(endereco: string | undefined): boolean {
  if (!endereco) return false;
  const ip = endereco.replace(/^::ffff:/i, '').toLowerCase();

  if (ip === '::1' || ip.startsWith('127.')) return true;
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:')) return true;

  const partes = ip.split('.').map(Number);
  if (partes.length !== 4 || partes.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return false;
  }
  const [a, b] = partes;
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

/**
 * Deixa passar só quem chega de dentro da rede (o Prometheus, no Docker, ou a própria máquina). As métricas
 * mostram rotas, volume e erros do sistema: não são para a internet. Atrás de um proxy, `trust proxy` precisa
 * estar configurado para o IP de quem pediu aparecer (um pedido vindo da internet traz o IP público dele).
 */
export function somenteRedePrivada(req: Request, res: Response, next: NextFunction): void {
  if (ehEnderecoPrivado(req.ip)) {
    next();
    return;
  }
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Não encontrado' } });
}
