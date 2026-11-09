import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrivacidadePage } from '@/pages/PrivacidadePage';
import { TermosPage } from '@/pages/TermosPage';
import { AuthShell } from '@/pages/AuthShell';
import * as privacidadeApi from './privacidade.api';
import { AvisoResponsabilidade } from './AvisoResponsabilidade';
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
    expect(screen.getByRole('heading', { name: /10\. Seus direitos/ })).toBeInTheDocument();
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

  it('os Termos dizem que a responsabilidade pelos itens é só de quem empresta e de quem aluga, e que a USAI fica de fora', () => {
    dentroDoRouter(<TermosPage />);

    expect(
      screen.getByRole('heading', { name: /5\. Responsabilidade pelos itens/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/exclusivamente de quem empresta e de quem aluga/)).toBeInTheDocument();
    expect(screen.getByText(/sem envolver a USAI/)).toBeInTheDocument();
    expect(screen.getByText(/A USAI não arbitra disputas/)).toBeInTheDocument();
  });

  it('os documentos têm índice com links para as seções', () => {
    dentroDoRouter(<TermosPage />);

    const indice = screen.getByRole('navigation', { name: 'Índice do documento' });
    expect(
      within(indice).getByRole('link', { name: /5\. Responsabilidade pelos itens/ }),
    ).toHaveAttribute('href', '#responsabilidade-pelos-itens');
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

describe('AvisoResponsabilidade', () => {
  it('lembra que a USAI não responde pelo item, nas duas pontas da locação', () => {
    const { unmount } = render(<AvisoResponsabilidade papel="locatario" />);
    expect(screen.getByRole('note')).toHaveTextContent(/Quem aluga cuida do item/);
    expect(screen.getByRole('note')).toHaveTextContent(
      /não responde por itens perdidos, furtados ou danificados/,
    );
    expect(screen.getByRole('link', { name: 'Ler a regra completa' })).toHaveAttribute(
      'href',
      '/termos#responsabilidade-pelos-itens',
    );
    unmount();

    render(<AvisoResponsabilidade papel="proprietario" />);
    expect(screen.getByRole('note')).toHaveTextContent(/Quem empresta responde pelas informações/);
  });
});

async function abrirMenu() {
  await userEvent.click(screen.getByRole('button', { name: 'Dados e privacidade' }));
}

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
    await abrirMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Baixar meus dados' }));

    expect(baixar).toHaveBeenCalled();
    expect(criarUrl).toHaveBeenCalled();
    expect(clicar).toHaveBeenCalled();
  });

  it('mostra o erro quando o download falha', async () => {
    vi.spyOn(privacidadeApi, 'baixarMeusDados').mockRejectedValue(new Error('rede'));

    dentroDoRouter(<SeusDados aoExcluir={vi.fn()} />);
    await abrirMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Baixar meus dados' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('excluir a conta exige a senha e a palavra EXCLUIR, e só então chama o servidor', async () => {
    const excluir = vi.spyOn(privacidadeApi, 'excluirMinhaConta').mockResolvedValue();
    const aoExcluir = vi.fn();

    dentroDoRouter(<SeusDados aoExcluir={aoExcluir} />);
    await abrirMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Excluir minha conta' }));

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
    await abrirMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Excluir minha conta' }));
    await userEvent.type(screen.getByLabelText('Sua senha'), 'senha-forte-123');
    await userEvent.type(screen.getByLabelText('Digite EXCLUIR para confirmar'), 'EXCLUIR');
    await userEvent.click(screen.getByRole('button', { name: 'Excluir para sempre' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Você ainda tem saldo a sacar.');
    expect(aoExcluir).not.toHaveBeenCalled();
  });

  it('cancelar fecha a janela sem excluir nada', async () => {
    const excluir = vi.spyOn(privacidadeApi, 'excluirMinhaConta');

    dentroDoRouter(<SeusDados aoExcluir={vi.fn()} />);
    await abrirMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Excluir minha conta' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(excluir).not.toHaveBeenCalled();
  });

  it('a tecla Esc também fecha a janela de exclusão', async () => {
    dentroDoRouter(<SeusDados aoExcluir={vi.fn()} />);
    await abrirMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Excluir minha conta' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mostra no menu quando a pessoa aceitou os Termos (registro feito no cadastro)', async () => {
    dentroDoRouter(<SeusDados aceitouTermosEm="2026-11-09T12:00:00.000Z" aoExcluir={vi.fn()} />);
    await abrirMenu();

    expect(screen.getByText(/Aceite registrado/)).toHaveTextContent(/09\/11\/2026/);
    expect(screen.getByRole('menuitem', { name: 'Termos de Uso' })).toHaveAttribute(
      'href',
      '/termos',
    );
    expect(screen.getByRole('menuitem', { name: 'Política de Privacidade' })).toHaveAttribute(
      'href',
      '/privacidade',
    );
  });

  it('sem registro de aceite (conta antiga), não mostra a linha do aceite', async () => {
    dentroDoRouter(<SeusDados aoExcluir={vi.fn()} />);
    await abrirMenu();

    expect(screen.queryByText(/Aceite registrado/)).not.toBeInTheDocument();
  });

  it('as opções ficam escondidas até abrir a engrenagem, e Esc ou clicar fora fecham o menu', async () => {
    dentroDoRouter(
      <div>
        <p>fora do menu</p>
        <SeusDados aoExcluir={vi.fn()} />
      </div>,
    );

    expect(screen.queryByRole('menuitem', { name: 'Excluir minha conta' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir minha conta' })).not.toBeInTheDocument();

    await abrirMenu();
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await abrirMenu();
    await userEvent.click(screen.getByText('fora do menu'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
