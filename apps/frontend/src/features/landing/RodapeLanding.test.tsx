import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RodapeLanding } from './RodapeLanding';

function renderRodape() {
  render(
    <MemoryRouter>
      <RodapeLanding
        miolo="mx-auto"
        rodapeInstitucional="Documento gerado pela plataforma USAI."
        nomeInstitucional="USAI: compartilhamento entre vizinhos"
      />
    </MemoryRouter>,
  );
}

describe('RodapeLanding', () => {
  it('mostra WhatsApp e e-mail como links, o WhatsApp abrindo em outra aba', () => {
    renderRodape();

    const whatsapp = screen.getByRole('link', { name: /WhatsApp\s*\(47\) 99925-2028/ });
    expect(whatsapp).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/5547999252028'),
    );
    expect(whatsapp).toHaveAttribute('target', '_blank');
    expect(whatsapp).toHaveAttribute('rel', expect.stringContaining('noopener'));

    expect(screen.getByRole('link', { name: /E-mail\s*usaisuporte@gmail.com/ })).toHaveAttribute(
      'href',
      'mailto:usaisuporte@gmail.com',
    );
  });

  it('cada assunto do suporte abre o WhatsApp já com a mensagem sobre aquele assunto', () => {
    renderRodape();

    const pix = screen.getByRole('link', { name: 'Pagamento por PIX' });
    expect(pix).toHaveAttribute('href', expect.stringContaining('wa.me/5547999252028?text='));
    expect(decodeURIComponent(pix.getAttribute('href') ?? '')).toContain('pagamento por PIX');
    expect(screen.getByRole('link', { name: 'Contratação e planos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Locações, termos e documentos' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Acesso, senha e convite dos vizinhos' }),
    ).toBeInTheDocument();
  });

  it('leva às seções da página e às telas de entrada e contratação', () => {
    renderRodape();

    const nav = screen.getByRole('navigation', { name: 'Navegação do rodapé' });
    expect(within(nav).getByRole('link', { name: 'Como funciona' })).toHaveAttribute(
      'href',
      '#como-funciona',
    );
    expect(within(nav).getByRole('link', { name: 'Planos' })).toHaveAttribute('href', '#planos');
    expect(within(nav).getByRole('link', { name: 'Perguntas frequentes' })).toHaveAttribute(
      'href',
      '#perguntas',
    );
    expect(within(nav).getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
    expect(
      within(nav).getByRole('link', { name: 'Contratar para o meu condomínio' }),
    ).toHaveAttribute('href', '/contratar');
  });

  it('mantém o texto institucional e o nome configurados pelo Admin', () => {
    renderRodape();

    expect(screen.getByText('Documento gerado pela plataforma USAI.')).toBeInTheDocument();
    expect(screen.getByText('USAI: compartilhamento entre vizinhos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voltar ao topo/ })).toHaveAttribute('href', '#topo');
  });
});
