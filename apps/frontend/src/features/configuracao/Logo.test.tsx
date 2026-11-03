import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  vi.spyOn(assinaturasApi, 'listarPlanos').mockResolvedValue({ periodos: [], planos: [] });
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

  function renderLanding() {
    vi.spyOn(api, 'buscarConfiguracao').mockRejectedValue(new Error('offline'));

    return render(
      <MemoryRouter>
        <ConfiguracaoProvider>
          <LandingPage />
        </ConfiguracaoProvider>
      </MemoryRouter>,
    );
  }

  it('a tela inicial explica o produto: como funciona, chamadas para contratar e entrar', () => {
    renderLanding();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Itens e serviços entre vizinhos',
    );
    expect(screen.getByRole('heading', { name: 'Como funciona' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText('Retire e devolva com termo')).toBeInTheDocument();
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

  it('explica que não são só itens: serviços e ajuda de vizinhos pelo Mural', () => {
    renderLanding();

    expect(
      screen.getByRole('heading', { name: 'Muito além de itens parados' }),
    ).toBeInTheDocument();
    const servicos = screen
      .getByRole('heading', { name: 'Serviços e ajuda de quem mora aqui' })
      .closest('li');
    expect(servicos).toHaveTextContent(/eletricista/);
    expect(servicos).toHaveTextContent(/maquiadora/);
    expect(servicos).toHaveTextContent(/Mural/);
  });

  it('mostra as proteções de cada negociação e quem responde pelo material alugado', () => {
    renderLanding();

    const secao = screen
      .getByRole('heading', { name: 'Segurança em cada negociação' })
      .closest('section');
    expect(secao).not.toBeNull();
    const dentro = within(secao as HTMLElement);
    [
      'Só vizinhos',
      'O dono decide',
      'Pagamento confirmado sozinho',
      'Termo de responsabilidade',
      'Aceite com a sua senha',
      'Documento e histórico',
    ].forEach((titulo) =>
      expect(dentro.getByRole('heading', { name: titulo })).toBeInTheDocument(),
    );

    expect(
      dentro.getByRole('heading', { name: 'Quem responde pelo material alugado?' }),
    ).toBeInTheDocument();
    expect(dentro.getByText(/responde pela guarda e pela conservação/)).toBeInTheDocument();
    expect(dentro.getByText(/vedado emprestar, ceder ou sublocar/)).toBeInTheDocument();
    expect(dentro.getByText(/Perda, dano, defeito ou qualquer incidente/)).toBeInTheDocument();
  });

  it('explica os 10% do condomínio com o exemplo de R$ 100 (R$ 90 e R$ 10)', () => {
    renderLanding();

    const secao = screen
      .getByRole('heading', { name: 'O condomínio também ganha' })
      .closest('section');
    const dentro = within(secao as HTMLElement);

    expect(dentro.getByText('10% de cada locação fica com o condomínio')).toBeInTheDocument();
    expect(dentro.getByText(/Dinheiro para melhorias internas/)).toBeInTheDocument();
    expect(dentro.getByText('R$ 90,00')).toBeInTheDocument();
    expect(dentro.getByText('R$ 10,00')).toBeInTheDocument();
    expect(
      dentro.getByRole('img', { name: '90% para o dono do item e 10% para o condomínio' }),
    ).toBeInTheDocument();
  });

  it('tem perguntas frequentes que abrem e fecham, sem JavaScript extra', async () => {
    renderLanding();

    const secao = screen.getByRole('heading', { name: 'Perguntas frequentes' }).closest('section');
    const itens = (secao as HTMLElement).querySelectorAll('details');
    expect(itens.length).toBeGreaterThanOrEqual(6);

    const servicos = Array.from(itens).find((d) =>
      /Posso pedir ou oferecer serviços/.test(d.textContent ?? ''),
    );
    expect(servicos).toBeDefined();
    expect(servicos).not.toHaveAttribute('open');
    await userEvent.click(
      within(servicos as HTMLElement).getByText('Posso pedir ou oferecer serviços?'),
    );
    expect(servicos).toHaveAttribute('open');
    expect(servicos).toHaveTextContent(/chat privado/);

    const mensalidade = Array.from(itens).find((d) =>
      /moradores pagam mensalidade/.test(d.textContent ?? ''),
    );
    expect(mensalidade).toHaveTextContent(/10% vão para o condomínio e 90% para o dono/);

    // o valor mínimo do aluguel está explicado (e é o mesmo que a plataforma aplica)
    const minimo = Array.from(itens).find((d) =>
      /Qual o valor mínimo de um aluguel/.test(d.textContent ?? ''),
    );
    expect(minimo).toHaveTextContent(/pelo menos R\$\s5,00/);
    expect(minimo).toHaveTextContent(/PIX/);
  });

  it('a navegação do topo leva às seções (como funciona, segurança e planos)', () => {
    renderLanding();

    const nav = within(screen.getByRole('navigation', { name: 'Principal' }));
    expect(nav.getByRole('link', { name: 'Como funciona' })).toHaveAttribute(
      'href',
      '#como-funciona',
    );
    expect(nav.getByRole('link', { name: 'Segurança' })).toHaveAttribute('href', '#seguranca');
    expect(nav.getByRole('link', { name: 'Planos' })).toHaveAttribute('href', '#planos');
    expect(document.getElementById('como-funciona')).not.toBeNull();
    expect(document.getElementById('seguranca')).not.toBeNull();
    expect(document.getElementById('planos')).not.toBeNull();
    expect(document.getElementById('perguntas')).not.toBeNull();
  });
});
