import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as authApi from '@/features/auth/auth.api';
import { getStoredUser } from '@/lib/authStorage';
import { CadastroPage } from './CadastroPage';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

function renderPage(entrada: string) {
  return render(
    <MemoryRouter initialEntries={[entrada]}>
      <Routes>
        <Route path="/cadastro" element={<CadastroPage />} />
        <Route path="/mural" element={<p>Mural do condomínio</p>} />
        <Route path="/login" element={<p>Página de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CadastroPage', () => {
  it('com o link do condomínio: mostra o formulário, a dica da senha e o atalho para quem já tem conta', async () => {
    renderPage('/cadastro?condominio=residencial-aurora');

    expect(screen.getByText('Condomínio: residencial-aurora')).toBeInTheDocument();
    expect(screen.getByText(/Use de 8 a 72 caracteres/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: 'Entrar' }));
    expect(screen.getByText('Página de login')).toBeInTheDocument();
  });

  it('cria a conta com o PIN, guarda a sessão e abre o mural', async () => {
    const cadastrar = vi.spyOn(authApi, 'cadastrarMorador').mockResolvedValue({
      accessToken: 'acesso',
      refreshToken: 'refresh',
      user: {
        id: 'u1',
        nome: 'Ana Moradora',
        email: 'ana@exemplo.com',
        papel: 'MORADOR',
        condominioId: 'cond-1',
        apartamento: '101',
      },
    });

    renderPage('/cadastro?condominio=residencial-aurora');
    await userEvent.type(screen.getByLabelText('PIN do condomínio'), '123456');
    await userEvent.type(screen.getByLabelText('Nome completo'), 'Ana Moradora');
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha12345');
    await userEvent.type(screen.getByLabelText('Apartamento (opcional)'), '101');
    await userEvent.click(screen.getByRole('checkbox', { name: /Li e aceito os Termos de Uso/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(cadastrar).toHaveBeenCalledWith(
      expect.objectContaining({
        linkSlug: 'residencial-aurora',
        pin: '123456',
        email: 'ana@exemplo.com',
        aceiteTermos: true,
      }),
    );
    expect(await screen.findByText('Mural do condomínio')).toBeInTheDocument();
    expect(getStoredUser()?.nome).toBe('Ana Moradora');
  });

  it('PIN errado: mostra o motivo e não sai da tela', async () => {
    vi.spyOn(authApi, 'cadastrarMorador').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'PIN inválido para este condomínio' } } },
    });

    renderPage('/cadastro?condominio=residencial-aurora');
    await userEvent.type(screen.getByLabelText('PIN do condomínio'), '000000');
    await userEvent.type(screen.getByLabelText('Nome completo'), 'Ana Moradora');
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha12345');
    await userEvent.click(screen.getByRole('checkbox', { name: /Li e aceito os Termos de Uso/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('PIN inválido');
    expect(screen.queryByText('Mural do condomínio')).not.toBeInTheDocument();
  });

  it('sem o link do condomínio: pede o código antes de mostrar o formulário', async () => {
    renderPage('/cadastro');

    expect(screen.getByText('Entrar no seu condomínio')).toBeInTheDocument();
    await userEvent.type(
      screen.getByPlaceholderText('ex.: residencial-jardim-europa'),
      'meu-condominio',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.getByText('Condomínio: meu-condominio')).toBeInTheDocument();
  });

  it('cadastro manual: cola o link completo do síndico e usa só o código do condomínio (issue #26)', async () => {
    renderPage('/cadastro');

    await userEvent.type(
      screen.getByPlaceholderText('ex.: residencial-jardim-europa'),
      'https://usainet.com.br/cadastro?condominio=residencial-exemplo',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.getByText('Condomínio: residencial-exemplo')).toBeInTheDocument();
  });

  it('cadastro manual: texto que não é código nem link recebe aviso no campo e não abre o formulário (issue #26)', async () => {
    renderPage('/cadastro');

    await userEvent.type(
      screen.getByPlaceholderText('ex.: residencial-jardim-europa'),
      'https://outro-site.com/pagina',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Não reconheci esse código');
    expect(screen.queryByLabelText('PIN do condomínio')).not.toBeInTheDocument();
  });

  it('com o formulário aberto, dá para trocar o código do condomínio (issue #26)', async () => {
    renderPage('/cadastro?condominio=residencial-errado');

    await userEvent.click(screen.getByRole('button', { name: 'Trocar o código' }));

    expect(screen.getByText('Entrar no seu condomínio')).toBeInTheDocument();
  });

  it('só deixa criar a conta depois de aceitar os Termos e a Política de Privacidade (LGPD)', async () => {
    const cadastrar = vi.spyOn(authApi, 'cadastrarMorador');
    renderPage('/cadastro?condominio=residencial-aurora');

    const botao = screen.getByRole('button', { name: 'Criar conta' });
    expect(botao).toBeDisabled();
    // O aceite traz os links (e as telas de acesso repetem os dois no rodapé do cartão).
    const links = screen.getAllByRole('link', { name: 'Termos de Uso' });
    expect(links.length).toBeGreaterThanOrEqual(2);
    links.forEach((link) => expect(link).toHaveAttribute('href', '/termos'));
    screen
      .getAllByRole('link', { name: 'Política de Privacidade' })
      .forEach((link) => expect(link).toHaveAttribute('href', '/privacidade'));

    await userEvent.click(screen.getByRole('checkbox', { name: /Li e aceito os Termos de Uso/ }));
    expect(botao).toBeEnabled();
    expect(cadastrar).not.toHaveBeenCalled();
  });
});
