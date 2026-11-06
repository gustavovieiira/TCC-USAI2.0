import { describe, expect, it } from 'vitest';
import { extractErrorMessage } from './apiClient';

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
