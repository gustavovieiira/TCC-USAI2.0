import { Request, Response } from 'express';
import { criarLimitador } from '@/common/rateLimit';

function chamar(limitador: ReturnType<typeof criarLimitador>, ip: string) {
  const next = jest.fn();
  limitador({ ip } as Request, {} as Response, next);
  return next.mock.calls[0][0];
}

describe('criarLimitador', () => {
  it('deixa passar até o máximo e bloqueia a partir daí, por IP', () => {
    const limitador = criarLimitador({ max: 2, janelaMs: 60_000, ativoEmTeste: true });

    expect(chamar(limitador, '1.1.1.1')).toBeUndefined();
    expect(chamar(limitador, '1.1.1.1')).toBeUndefined();
    const erro = chamar(limitador, '1.1.1.1');
    expect(erro).toMatchObject({ statusCode: 429, code: 'TOO_MANY_REQUESTS' });

    // outro IP não é afetado
    expect(chamar(limitador, '2.2.2.2')).toBeUndefined();
  });

  it('libera de novo depois da janela', () => {
    jest.useFakeTimers();
    const limitador = criarLimitador({ max: 1, janelaMs: 1000, ativoEmTeste: true });

    expect(chamar(limitador, '3.3.3.3')).toBeUndefined();
    expect(chamar(limitador, '3.3.3.3')).toBeDefined();
    jest.advanceTimersByTime(1500);
    expect(chamar(limitador, '3.3.3.3')).toBeUndefined();
    jest.useRealTimers();
  });

  it('não age nos testes automatizados por padrão', () => {
    const limitador = criarLimitador({ max: 1, janelaMs: 60_000 });
    expect(chamar(limitador, '4.4.4.4')).toBeUndefined();
    expect(chamar(limitador, '4.4.4.4')).toBeUndefined();
  });
});
