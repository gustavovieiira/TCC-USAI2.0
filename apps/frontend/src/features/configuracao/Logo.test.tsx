import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Logo } from '@/components/ui/Logo';
import { LandingPage } from '@/pages/LandingPage';
import { AuthShell } from '@/pages/AuthShell';
import * as api from './configuracao.api';
import { ConfiguracaoProvider } from './ConfiguracaoContext';
import { ConfiguracaoDTO } from './configuracao.types';

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
  it('na tela inicial', async () => {
    vi.spyOn(api, 'buscarConfiguracao').mockResolvedValue(comLogo);

    render(
      <MemoryRouter>
        <ConfiguracaoProvider>
          <LandingPage />
        </ConfiguracaoProvider>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'Condomínio Aurora' })).toBeInTheDocument(),
    );
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
