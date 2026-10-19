import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CardClicavel } from './CardClicavel';
import { Modal } from './Modal';

describe('CardClicavel', () => {
  it('clicar no texto do card abre os detalhes', async () => {
    const onAbrir = vi.fn();
    render(
      <CardClicavel onAbrir={onAbrir}>
        <p>Conteúdo do card</p>
      </CardClicavel>,
    );

    await userEvent.click(screen.getByText('Conteúdo do card'));

    expect(onAbrir).toHaveBeenCalledTimes(1);
  });

  it('o botão "Ver detalhes e recibo" abre uma única vez (teclado e leitor de tela)', async () => {
    const onAbrir = vi.fn();
    render(
      <CardClicavel onAbrir={onAbrir}>
        <p>Conteúdo</p>
      </CardClicavel>,
    );

    await userEvent.click(screen.getByRole('button', { name: /Ver detalhes e recibo/ }));

    expect(onAbrir).toHaveBeenCalledTimes(1);
  });

  it('botões e campos dentro do card fazem o seu trabalho sem abrir os detalhes', async () => {
    const onAbrir = vi.fn();
    const onAprovar = vi.fn();
    render(
      <CardClicavel onAbrir={onAbrir}>
        <button type="button" onClick={onAprovar}>
          Aprovar
        </button>
        <form>
          <label>
            Motivo
            <input name="motivo" />
          </label>
        </form>
      </CardClicavel>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Aprovar' }));
    await userEvent.type(screen.getByLabelText('Motivo'), 'abc');

    expect(onAprovar).toHaveBeenCalledTimes(1);
    expect(onAbrir).not.toHaveBeenCalled();
  });
});

describe('Modal', () => {
  it('clicar no fundo escuro fecha; clicar dentro da janela não', async () => {
    const onFechar = vi.fn();
    render(
      <Modal titulo="Detalhes" onFechar={onFechar}>
        <p>Dentro da janela</p>
      </Modal>,
    );

    await userEvent.click(screen.getByText('Dentro da janela'));
    expect(onFechar).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('presentation'));
    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it('Esc e o ✕ fecham', async () => {
    const onFechar = vi.fn();
    render(
      <Modal titulo="Detalhes" onFechar={onFechar}>
        <p>Conteúdo</p>
      </Modal>,
    );

    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Fechar janela' }));

    expect(onFechar).toHaveBeenCalledTimes(2);
  });

  it('é um diálogo modal acessível, com o título como nome', () => {
    render(
      <Modal titulo="Detalhes do saque" onFechar={() => undefined}>
        <p>Conteúdo</p>
      </Modal>,
    );

    expect(screen.getByRole('dialog', { name: 'Detalhes do saque' })).toHaveAttribute(
      'aria-modal',
      'true',
    );
  });
});
