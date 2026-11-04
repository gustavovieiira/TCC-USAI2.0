import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as authApi from '@/features/auth/auth.api';
import { EsqueciSenhaPage } from './EsqueciSenhaPage';
import { LoginPage } from './LoginPage';
import { RedefinirSenhaPage } from './RedefinirSenhaPage';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LoginPage', () => {
  it('tem o atalho "Esqueci minha senha" que leva para a página de recuperação', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/esqueci-senha" element={<p>Página esqueci a senha</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('link', { name: 'Esqueci minha senha' }));

    expect(screen.getByText('Página esqueci a senha')).toBeInTheDocument();
  });
});

describe('EsqueciSenhaPage', () => {
  function renderPage() {
    return render(
      <MemoryRouter initialEntries={['/esqueci-senha']}>
        <Routes>
          <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('pede o link para o e-mail informado e confirma sem dizer se a conta existe', async () => {
    const pedir = vi.spyOn(authApi, 'esqueciSenha').mockResolvedValue();

    renderPage();
    await userEvent.type(screen.getByLabelText('E-mail'), ' silvia@exemplo.com ');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));

    expect(pedir).toHaveBeenCalledWith('silvia@exemplo.com');
    expect(await screen.findByRole('status')).toHaveTextContent(/silvia@exemplo\.com.*1 hora/s);
    expect(screen.getByText(/Se houver uma conta com esse endereço/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para Entrar' })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('mostra o erro quando o pedido falha (ex.: muitos pedidos seguidos)', async () => {
    vi.spyOn(authApi, 'esqueciSenha').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'Muitos pedidos de nova senha.' } } },
    });

    renderPage();
    await userEvent.type(screen.getByLabelText('E-mail'), 'silvia@exemplo.com');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Muitos pedidos');
  });
});

describe('RedefinirSenhaPage', () => {
  function renderPage(entrada: string) {
    return render(
      <MemoryRouter initialEntries={[entrada]}>
        <Routes>
          <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  async function preencher(senha: string, confirmacao: string) {
    await userEvent.type(screen.getByLabelText('Nova senha'), senha);
    await userEvent.type(screen.getByLabelText('Repita a senha'), confirmacao);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
  }

  it('troca a senha com o link do e-mail e manda entrar com a senha nova', async () => {
    const redefinir = vi.spyOn(authApi, 'redefinirSenha').mockResolvedValue();

    renderPage('/redefinir-senha?token=abc123token');
    await preencher('minha-senha-nova', 'minha-senha-nova');

    expect(redefinir).toHaveBeenCalledWith('abc123token', 'minha-senha-nova');
    expect(await screen.findByText('Senha alterada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para Entrar' })).toHaveAttribute('href', '/login');
  });

  it('não envia quando as senhas não conferem', async () => {
    const redefinir = vi.spyOn(authApi, 'redefinirSenha');

    renderPage('/redefinir-senha?token=abc123token');
    await preencher('minha-senha-nova', 'outra-senha-xyz');

    expect(screen.getByRole('alert')).toHaveTextContent('As senhas não conferem');
    expect(redefinir).not.toHaveBeenCalled();
  });

  it('link vencido ou usado: mostra a mensagem do servidor e oferece pedir outro', async () => {
    vi.spyOn(authApi, 'redefinirSenha').mockRejectedValue({
      isAxiosError: true,
      response: {
        data: { error: { message: 'Este link expirou. Peça outro em "Esqueci minha senha".' } },
      },
    });

    renderPage('/redefinir-senha?token=abc123token');
    await preencher('minha-senha-nova', 'minha-senha-nova');

    expect(await screen.findByRole('alert')).toHaveTextContent('expirou');
    expect(screen.getByRole('link', { name: 'Pedir um novo link' })).toHaveAttribute(
      'href',
      '/esqueci-senha',
    );
  });

  it('sem o código na URL: avisa que o link é inválido e não mostra o formulário', () => {
    renderPage('/redefinir-senha');

    expect(screen.getByText('Link inválido')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedir um novo link' })).toBeInTheDocument();
  });
});
