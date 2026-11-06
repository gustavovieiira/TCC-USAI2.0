import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrivacidadePage } from '@/pages/PrivacidadePage';
import { TermosPage } from '@/pages/TermosPage';
import { AuthShell } from '@/pages/AuthShell';
import * as privacidadeApi from './privacidade.api';
import { SeusDados } from './SeusDados';

afterEach(() => vi.restoreAllMocks());

function dentroDoRouter(elemento: JSX.Element) {
  return render(<MemoryRouter>{elemento}</MemoryRouter>);
}

describe('páginas legais', () => {
  it('a Política de Privacidade descreve dados, bases legais, direitos e o contato do titular', () => {
    dentroDoRouter(<PrivacidadePage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Política de Privacidade' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Seus direitos/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /bases legais/ })).toBeInTheDocument();
    expect(screen.getByText(/Baixar meus dados/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /usaisuporte@gmail\.com/ }).length).toBeGreaterThan(
      0,
    );
  });

  it('os Termos de Uso explicam a locação e apontam para a Política de Privacidade', () => {
    dentroDoRouter(<TermosPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Termos de Uso' })).toBeInTheDocument();
    expect(screen.getByText(/não é dona dos itens nem parte da locação/)).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'Política de Privacidade' });
    expect(links[0]).toHaveAttribute('href', '/privacidade');
  });

  it('as telas de acesso trazem os dois links', () => {
    dentroDoRouter(
      <AuthShell title="Entrar" subtitle="Acesse sua conta">
        <p>formulário</p>
      </AuthShell>,
    );

    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/termos');
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute(
      'href',
      '/privacidade',
    );
  });
});

describe('SeusDados (direitos do titular)', () => {
  it('"Baixar meus dados" pede o arquivo e dispara o download', async () => {
    const baixar = vi
      .spyOn(privacidadeApi, 'baixarMeusDados')
      .mockResolvedValue(new Blob(['{}'], { type: 'application/json' }));
    const criarUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:arquivo');
    const clicar = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    dentroDoRouter(<SeusDados aoExcluir={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Baixar meus dados' }));

    expect(baixar).toHaveBeenCalled();
    expect(criarUrl).toHaveBeenCalled();
    expect(clicar).toHaveBeenCalled();
  });

  it('mostra o erro quando o download falha', async () => {
    vi.spyOn(privacidadeApi, 'baixarMeusDados').mockRejectedValue(new Error('rede'));

    dentroDoRouter(<SeusDados aoExcluir={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Baixar meus dados' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('excluir a conta exige a senha e a palavra EXCLUIR, e só então chama o servidor', async () => {
    const excluir = vi.spyOn(privacidadeApi, 'excluirMinhaConta').mockResolvedValue();
    const aoExcluir = vi.fn();

    dentroDoRouter(<SeusDados aoExcluir={aoExcluir} />);
    await userEvent.click(screen.getByRole('button', { name: 'Excluir minha conta' }));

    const confirmar = screen.getByRole('button', { name: 'Excluir para sempre' });
    expect(confirmar).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Sua senha'), 'senha-forte-123');
    expect(confirmar).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Digite EXCLUIR para confirmar'), 'excluir');
    expect(confirmar).toBeEnabled();

    await userEvent.click(confirmar);

    expect(excluir).toHaveBeenCalledWith('senha-forte-123');
    expect(aoExcluir).toHaveBeenCalled();
  });

  it('mostra o motivo quando o servidor recusa (por exemplo, saldo a sacar) e não encerra a sessão', async () => {
    vi.spyOn(privacidadeApi, 'excluirMinhaConta').mockRejectedValue(
      Object.assign(new Error('x'), {
        isAxiosError: true,
        response: {
          data: { error: { code: 'SALDO_A_SACAR', message: 'Você ainda tem saldo a sacar.' } },
        },
      }),
    );
    const aoExcluir = vi.fn();

    dentroDoRouter(<SeusDados aoExcluir={aoExcluir} />);
    await userEvent.click(screen.getByRole('button', { name: 'Excluir minha conta' }));
    await userEvent.type(screen.getByLabelText('Sua senha'), 'senha-forte-123');
    await userEvent.type(screen.getByLabelText('Digite EXCLUIR para confirmar'), 'EXCLUIR');
    await userEvent.click(screen.getByRole('button', { name: 'Excluir para sempre' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Você ainda tem saldo a sacar.');
    expect(aoExcluir).not.toHaveBeenCalled();
  });

  it('cancelar fecha a janela sem excluir nada', async () => {
    const excluir = vi.spyOn(privacidadeApi, 'excluirMinhaConta');

    dentroDoRouter(<SeusDados aoExcluir={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Excluir minha conta' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(excluir).not.toHaveBeenCalled();
  });

  it('a tecla Esc também fecha a janela de exclusão', async () => {
    dentroDoRouter(<SeusDados aoExcluir={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Excluir minha conta' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
