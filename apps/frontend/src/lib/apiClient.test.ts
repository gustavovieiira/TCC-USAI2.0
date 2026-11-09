import axios, { AxiosAdapter, AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, extractErrorMessage } from './apiClient';

function erroDaApi(error: Record<string, unknown>) {
  return Object.assign(new Error('x'), { isAxiosError: true, response: { data: { error } } });
}

describe('extractErrorMessage', () => {
  it('usa a mensagem que o servidor mandou', () => {
    expect(extractErrorMessage(erroDaApi({ code: 'INVALID_PIN', message: 'PIN inválido' }))).toBe(
      'PIN inválido',
    );
  });

  it('em falha de validação mostra o primeiro motivo, não só "Dados inválidos"', () => {
    const erro = erroDaApi({
      code: 'VALIDATION_ERROR',
      message: 'Dados inválidos',
      details: {
        formErrors: [],
        fieldErrors: { senha: ['Essa senha é fácil de adivinhar. Escolha outra.'] },
      },
    });

    expect(extractErrorMessage(erro)).toBe('Essa senha é fácil de adivinhar. Escolha outra.');
  });

  it('validação sem detalhes cai na mensagem geral', () => {
    expect(
      extractErrorMessage(erroDaApi({ code: 'VALIDATION_ERROR', message: 'Dados inválidos' })),
    ).toBe('Dados inválidos');
  });

  it('sem resposta do servidor (rede fora) devolve a mensagem padrão', () => {
    expect(extractErrorMessage(Object.assign(new Error('x'), { isAxiosError: true }))).toBe(
      'Não foi possível completar a operação.',
    );
  });

  it('erro que não veio do axios devolve a mensagem de erro inesperado', () => {
    expect(extractErrorMessage(new Error('boom'))).toBe('Erro inesperado. Tente novamente.');
  });
});

describe('renovação automática da sessão', () => {
  const adapterOriginal = apiClient.defaults.adapter;

  /** Respostas de mentira, em ordem, no lugar da rede. */
  function simularRede(respostas: Array<{ status: number; data?: unknown }>) {
    const chamadas: string[] = [];
    let i = 0;
    const adapter: AxiosAdapter = async (config) => {
      chamadas.push(String(config.headers.Authorization));
      const r = respostas[i++] ?? respostas[respostas.length - 1];
      const resposta = {
        data: r.data ?? {},
        status: r.status,
        statusText: '',
        headers: {},
        config,
      } as AxiosResponse;
      if (r.status >= 400) {
        throw new axios.AxiosError('falhou', String(r.status), config, null, resposta);
      }
      return resposta;
    };
    apiClient.defaults.adapter = adapter;
    return chamadas;
  }

  const tokenVencido = {
    status: 401,
    data: { error: { code: 'TOKEN_INVALIDO', message: 'Token inválido ou expirado' } },
  };

  beforeEach(() => {
    localStorage.setItem('usai:accessToken', 'velho');
    localStorage.setItem('usai:refreshToken', 'renovacao');
  });

  afterEach(() => {
    apiClient.defaults.adapter = adapterOriginal;
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('quando o token vence, renova sozinho e repete a chamada com o token novo', async () => {
    const chamadas = simularRede([tokenVencido, { status: 200, data: { ok: true } }]);
    const renovar = vi
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: { accessToken: 'novo', refreshToken: 'renovacao-nova' } });

    const resposta = await apiClient.get('/mural');

    expect(resposta.data).toEqual({ ok: true });
    expect(renovar).toHaveBeenCalledWith(expect.stringContaining('/auth/refresh'), {
      refreshToken: 'renovacao',
    });
    expect(chamadas).toEqual(['Bearer velho', 'Bearer novo']);
    expect(localStorage.getItem('usai:accessToken')).toBe('novo');
    expect(localStorage.getItem('usai:refreshToken')).toBe('renovacao-nova');
  });

  it('várias chamadas vencidas ao mesmo tempo compartilham uma única renovação', async () => {
    simularRede([tokenVencido, tokenVencido, tokenVencido, { status: 200, data: { ok: true } }]);
    const renovar = vi
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: { accessToken: 'novo', refreshToken: 'renovacao-nova' } });

    await Promise.all([apiClient.get('/a'), apiClient.get('/b'), apiClient.get('/c')]);

    expect(renovar).toHaveBeenCalledTimes(1);
  });

  it('se não dá para renovar (sessão encerrada), limpa a sessão e devolve o erro', async () => {
    simularRede([tokenVencido]);
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('401'));
    const assign = vi.fn();
    vi.stubGlobal('location', { pathname: '/mural', assign });

    await expect(apiClient.get('/mural')).rejects.toBeTruthy();

    expect(localStorage.getItem('usai:accessToken')).toBeNull();
    expect(localStorage.getItem('usai:refreshToken')).toBeNull();
    expect(assign).toHaveBeenCalledWith('/login');
  });

  it('um 401 que não é de token vencido (como senha errada) não dispara a renovação', async () => {
    simularRede([
      { status: 401, data: { error: { code: 'UNAUTHORIZED', message: 'Senha incorreta' } } },
    ]);
    const renovar = vi.spyOn(axios, 'post');

    await expect(apiClient.post('/privacidade/excluir-conta', {})).rejects.toBeTruthy();

    expect(renovar).not.toHaveBeenCalled();
    expect(localStorage.getItem('usai:accessToken')).toBe('velho');
  });

  it('sem token de renovação (quem ainda não entrou), só devolve o erro', async () => {
    localStorage.removeItem('usai:refreshToken');
    simularRede([tokenVencido]);
    const renovar = vi.spyOn(axios, 'post');

    await expect(apiClient.get('/mural')).rejects.toBeTruthy();

    expect(renovar).not.toHaveBeenCalled();
  });

  it('não tenta renovar duas vezes a mesma chamada', async () => {
    simularRede([tokenVencido, tokenVencido]);
    const renovar = vi
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: { accessToken: 'novo', refreshToken: 'renovacao-nova' } });

    await expect(apiClient.get('/mural')).rejects.toBeTruthy();

    expect(renovar).toHaveBeenCalledTimes(1);
  });
});
