import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from './LoginForm';
import * as authApi from '../auth.api';

describe('LoginForm', () => {
  it('chama onSuccess com o resultado quando o login é bem-sucedido', async () => {
    const authResult = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: '1',
        nome: 'Ana',
        email: 'ana@example.com',
        papel: 'MORADOR' as const,
        condominioId: 'c1',
      },
    };
    vi.spyOn(authApi, 'login').mockResolvedValue(authResult);
    const onSuccess = vi.fn();

    render(<LoginForm onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-correta');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(authResult));
  });

  it('exibe mensagem de erro quando as credenciais são inválidas', async () => {
    vi.spyOn(authApi, 'login').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'Credenciais inválidas' } } },
    });

    render(<LoginForm onSuccess={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-errada');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
