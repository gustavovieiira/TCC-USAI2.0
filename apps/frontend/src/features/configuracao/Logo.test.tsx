import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logo } from '@/components/ui/Logo';
import { LandingPage } from '@/pages/LandingPage';
import { AuthShell } from '@/pages/AuthShell';
import * as assinaturasApi from '@/features/assinaturas/assinaturas.api';
import * as api from './configuracao.api';
import { ConfiguracaoProvider } from './ConfiguracaoContext';
import { ConfiguracaoDTO } from './configuracao.types';

// A tela inicial lista os planos; aqui não interessa o conteúdo, só não ir à rede.
beforeEach(() => {
  vi.spyOn(assinaturasApi, 'listarPlanos').mockResolvedValue([]);
});

const comLogo: ConfiguracaoDTO = {
  logoUrl: 'http://localhost:3000/uploads/marca/logo-empresa.png',
  nomeInstitucional: 'Condomínio Aurora',
  rodapeInstitucional: 'Rodapé da empresa',
};

describe('Logo', () => {
  it('sem logo oficial usa a marca padrão da USAI (o app nunca fica sem identidade)', () => {
    vi.spyOn(api, 'buscarConfiguracao').mockRejectedValue(new Error('offline'));

    render(
      <ConfiguracaoProvider>
        <Logo />
      </ConfiguracaoProvider>,
    );

    expect(screen.getByText('USAI')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('com logo oficial mostra a imagem, com o nome da empresa como texto alternativo e sem distorcer', async () => {
    vi.spyOn(api, 'buscarConfiguracao').mockResolvedValue(comLogo);

    render(
      <ConfiguracaoProvider>
        <Logo altura={40} />
      </ConfiguracaoProvider>,
    );

    const imagem = await screen.findByRole('img', { name: 'Condomínio Aurora' });
    expect(imagem).toHaveAttribute('src', comLogo.logoUrl);
    // altura fixa e largura automática: a proporção original é preservada
    expect(imagem).toHaveStyle({ height: '40px', width: 'auto' });
    expect(imagem.className).toContain('object-contain');
    expect(screen.queryByText('USAI')).not.toBeInTheDocument();
  });
});

describe('a logo aparece nas telas públicas', () => {
  it('na tela inicial (cabeçalho e rodapé) e o rodapé institucional configurado aparece', async () => {
    vi.spyOn(api, 'buscarConfiguracao').mockResolvedValue(comLogo);

    render(
      <MemoryRouter>
        <ConfiguracaoProvider>
          <LandingPage />
        </ConfiguracaoProvider>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(
        screen.getAllByRole('img', { name: 'Condomínio Aurora' }).length,
      ).toBeGreaterThanOrEqual(2),
    );
    expect(screen.getByText('Rodapé da empresa')).toBeInTheDocument();
  });

  it('no login e no cadastro (AuthShell)', async () => {
    vi.spyOn(api, 'buscarConfiguracao').mockResolvedValue(comLogo);

    render(
      <ConfiguracaoProvider>
        <AuthShell title="Entrar" subtitle="Acesse sua conta">
          <p>formulário</p>
        </AuthShell>
      </ConfiguracaoProvider>,
    );

    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'Condomínio Aurora' })).toBeInTheDocument(),
    );
  });
});

describe('marca padrão da USAI e tela inicial', () => {
  it('sem logo oficial, o símbolo (casa + U + item) aparece junto do nome, em SVG', () => {
    vi.spyOn(api, 'buscarConfiguracao').mockRejectedValue(new Error('offline'));

    const { container } = render(
      <ConfiguracaoProvider>
        <Logo altura={40} />
      </ConfiguracaoProvider>,
    );

    const simbolo = container.querySelector('svg');
    expect(simbolo).toBeInTheDocument();
    expect(simbolo).toHaveAttribute('aria-hidden', 'true');
    expect(simbolo).toHaveAttribute('width', '40');
    expect(screen.getByText('USAI')).toBeInTheDocument();
  });

  it('sem o nome, o texto continua acessível para leitores de tela', () => {
    vi.spyOn(api, 'buscarConfiguracao').mockRejectedValue(new Error('offline'));

    render(
      <ConfiguracaoProvider>
        <Logo comNome={false} />
      </ConfiguracaoProvider>,
    );

    expect(screen.getByText('USAI')).toHaveClass('sr-only');
  });

  it('a tela inicial explica o produto: como funciona, recursos e chamadas para cadastro e login', () => {
    vi.spyOn(api, 'buscarConfiguracao').mockRejectedValue(new Error('offline'));

    render(
      <MemoryRouter>
        <ConfiguracaoProvider>
          <LandingPage />
        </ConfiguracaoProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Compartilhe e alugue itens',
    );
    expect(screen.getByRole('heading', { name: 'Como funciona' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText('Retire e devolva com termo')).toBeInTheDocument();
    expect(screen.getByText('Termo e documento com aceite')).toBeInTheDocument();
    // chamadas para contratar (cabeçalho, abertura e faixa final)
    const contratar = screen.getAllByRole('link', { name: /Contratar/ });
    expect(contratar.length).toBeGreaterThan(1);
    contratar.forEach((link) => expect(link).toHaveAttribute('href', '/contratar'));
    expect(screen.getByRole('link', { name: /Cadastre-se com o link do síndico/ })).toHaveAttribute(
      'href',
      '/cadastro',
    );
    expect(screen.getByRole('heading', { name: 'Seu condomínio no ar' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Planos e preços' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Já tenho conta' })).toHaveAttribute('href', '/login');
    // sem configuração carregada, o rodapé institucional padrão é exibido
    expect(
      screen.getByText(/Documento gerado eletronicamente pela plataforma USAI/),
    ).toBeInTheDocument();
  });
});
