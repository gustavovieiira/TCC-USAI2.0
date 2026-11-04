import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContatoSuporte } from './ContatoSuporte';

describe('ContatoSuporte', () => {
  it('mostra o WhatsApp (com mensagem pronta) e o e-mail de suporte', () => {
    render(<ContatoSuporte mensagem="Olá, tenho uma dúvida" />);

    const whatsapp = screen.getByRole('link', { name: /\(47\) 99925-2028/ });
    expect(whatsapp).toHaveAttribute(
      'href',
      `https://wa.me/5547999252028?text=${encodeURIComponent('Olá, tenho uma dúvida')}`,
    );
    expect(whatsapp).toHaveAttribute('target', '_blank');
    expect(whatsapp).toHaveAttribute('rel', expect.stringContaining('noopener'));

    expect(screen.getByRole('link', { name: 'usaisuporte@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:usaisuporte@gmail.com',
    );
  });

  it('sem mensagem, usa a frase padrão no WhatsApp', () => {
    render(<ContatoSuporte />);

    expect(screen.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
      'href',
      expect.stringContaining(encodeURIComponent('Preciso de ajuda com a USAI')),
    );
  });
});
