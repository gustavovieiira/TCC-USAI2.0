import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MovimentacaoPage } from './MovimentacaoPage';
import * as api from '@/features/movimentacoes/movimentacoes.api';
import { buildDetalhe, concluida } from '@/features/movimentacoes/fixtures';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/movimentacoes/mov-1']}>
      <Routes>
        <Route path="/movimentacoes/:id" element={<MovimentacaoPage />} />
        <Route path="/locacoes" element={<p>Tela de locações</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MovimentacaoPage — o documento', () => {
  it('mostra todas as informações: nº, partes, item, locação, operação, termo, declarações e histórico', async () => {
    vi.spyOn(api, 'buscarMovimentacao').mockResolvedValue(buildDetalhe());

    renderPage();

    expect(
      await screen.findByRole('heading', { name: /Termo de Responsabilidade — Retirada/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('USAI-2026-000007')).toBeInTheDocument();
    // partes: nome completo, unidade, condomínio e CPF mascarado
    expect(screen.getAllByText('Davi Dono').length).toBeGreaterThan(0);
    expect(screen.getByText('202')).toBeInTheDocument();
    expect(screen.getByText('***.***.***-88')).toBeInTheDocument();
    // item identificado
    expect(screen.getByText('Projetor Epson')).toBeInTheDocument();
    expect(screen.getByText('Epson')).toBeInTheDocument();
    expect(screen.getByText('X49')).toBeInTheDocument();
    expect(screen.getByText('SN-123')).toBeInTheDocument();
    // locação e operação
    expect(screen.getByText('Sessão de cinema no salão')).toBeInTheDocument();
    expect(screen.getByText('Bom (sinais leves de uso)')).toBeInTheDocument();
    expect(screen.getByText(/1 de 2 acompanham a operação/)).toBeInTheDocument();
    expect(screen.getByText(/Controle remoto/)).toHaveTextContent('acompanha');
    expect(screen.getByText(/Cabo HDMI/)).toHaveTextContent('não entregue');
    expect(screen.getByText('Pequeno risco na lateral')).toBeInTheDocument();
    // termo completo
    expect(screen.getByText(/Termo de responsabilidade — versão 2/i)).toBeInTheDocument();
    expect(screen.getByText(/É vedado emprestar, ceder ou sublocar/)).toBeInTheDocument();
    // histórico
    expect(screen.getByText('Registro criado')).toBeInTheDocument();
    expect(screen.getByText(/Aguardando o aceite de Carla Locataria/)).toBeInTheDocument();
  });

  it('avisa que o termo é modelo pendente de revisão jurídica — e deixa de avisar depois de aprovado', async () => {
    vi.spyOn(api, 'buscarMovimentacao').mockResolvedValue(buildDetalhe());
    const { unmount } = renderPage();
    expect(
      await screen.findByText(/Texto modelo, pendente de revisão e aprovação jurídica/),
    ).toBeInTheDocument();
    unmount();

    vi.spyOn(api, 'buscarMovimentacao').mockResolvedValue(
      buildDetalhe({
        termo: {
          ...buildDetalhe().termo,
          statusRevisao: 'APROVADO',
          aprovadoEm: '2026-10-20T12:00:00.000Z',
        },
      }),
    );
    renderPage();
    expect(
      await screen.findByText(/Texto revisado e aprovado em 20\/10\/2026/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/pendente de revisão e aprovação jurídica/)).not.toBeInTheDocument();
  });

  it('concluída: mostra as declarações aceitas, quem aceitou e quando, a assinatura e a integridade verificada', async () => {
    vi.spyOn(api, 'buscarMovimentacao').mockResolvedValue(buildDetalhe(concluida));

    renderPage();

    expect(await screen.findByText(/Aceito por/)).toHaveTextContent('Carla Locataria');
    expect(screen.getByText(/assinatura eletrônica/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Verificada: o conteúdo corresponde ao registrado no aceite/),
    ).toBeInTheDocument();
    expect(screen.getByText(/SHA-256: f{64}/)).toBeInTheDocument();
    expect(screen.queryByText('Conferência e aceite')).not.toBeInTheDocument();
  });

  it('integridade divergente aparece como alerta', async () => {
    vi.spyOn(api, 'buscarMovimentacao').mockResolvedValue(
      buildDetalhe({ ...concluida, integridade: { hash: 'f'.repeat(64), verificada: false } }),
    );

    renderPage();

    expect(
      await screen.findByText(/Divergência: o conteúdo difere do que foi registrado/),
    ).toBeInTheDocument();
  });

  it('só o Admin vê IP no documento (a API só manda o IP pra ele)', async () => {
    vi.spyOn(api, 'buscarMovimentacao').mockResolvedValue(
      buildDetalhe({ ...concluida, aceite: { ...concluida.aceite!, ip: '10.0.0.5' } }),
    );

    renderPage();

    expect(await screen.findByText(/IP 10\.0\.0\.5/)).toBeInTheDocument();
  });

  it('registro cancelado diz que foi cancelado antes do aceite', async () => {
    vi.spyOn(api, 'buscarMovimentacao').mockResolvedValue(
      buildDetalhe({
        status: 'CANCELADA',
        permissoes: { aceitar: false, cancelar: false, retificar: false },
      }),
    );

    renderPage();

    expect(await screen.findByText('Registro cancelado antes do aceite.')).toBeInTheDocument();
  });

  it('"Imprimir / salvar em PDF" abre a impressão do navegador', async () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    vi.spyOn(api, 'buscarMovimentacao').mockResolvedValue(buildDetalhe());

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Imprimir / salvar em PDF' }));

    expect(imprimir).toHaveBeenCalled();
  });

  it('erro ao carregar mostra a mensagem e um caminho de volta', async () => {
    vi.spyOn(api, 'buscarMovimentacao').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'Você não participa deste registro' } } },
    });

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Você não participa deste registro');
    expect(screen.getByRole('link', { name: /Voltar/ })).toBeInTheDocument();
  });
});

describe('MovimentacaoPage — aceite obrigatório', () => {
  async function abrirAceite() {
    vi.spyOn(api, 'buscarMovimentacao').mockResolvedValue(buildDetalhe());
    renderPage();
    return screen.findByRole('button', { name: 'Assinar e concluir' });
  }

  it('nada vem marcado: as caixas começam vazias e o botão começa desabilitado', async () => {
    const botao = await abrirAceite();

    const caixas = screen.getAllByRole('checkbox');
    expect(caixas).toHaveLength(3);
    caixas.forEach((c) => expect(c).not.toBeChecked());
    expect(botao).toBeDisabled();
  });

  it('só habilita com TODAS as declarações marcadas e a senha preenchida', async () => {
    const botao = await abrirAceite();
    const caixas = screen.getAllByRole('checkbox');

    await userEvent.type(screen.getByLabelText('Confirme sua senha para assinar'), 'minha-senha');
    expect(botao).toBeDisabled();

    await userEvent.click(caixas[0]);
    await userEvent.click(caixas[1]);
    expect(botao).toBeDisabled();
    expect(screen.getByText(/Marque todas as declarações \(2 de 3\)/)).toBeInTheDocument();

    await userEvent.click(caixas[2]);
    expect(botao).toBeEnabled();

    await userEvent.click(caixas[1]); // desmarcar uma desabilita de novo
    expect(botao).toBeDisabled();
  });

  it('com tudo marcado e a senha, envia o aceite e passa a mostrar o documento concluído', async () => {
    const aceitar = vi.spyOn(api, 'aceitarMovimentacao').mockResolvedValue(buildDetalhe(concluida));
    const botao = await abrirAceite();

    for (const caixa of screen.getAllByRole('checkbox')) await userEvent.click(caixa);
    await userEvent.type(screen.getByLabelText('Confirme sua senha para assinar'), 'minha-senha');
    await userEvent.click(botao);

    expect(aceitar).toHaveBeenCalledWith('mov-1', {
      declaracoes: ['recebimento', 'ciencia', 'compromisso'],
      senha: 'minha-senha',
    });
    expect(await screen.findByText(/Aceito por/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assinar e concluir' })).not.toBeInTheDocument();
  });

  it('senha errada: mostra o erro, limpa a senha e não conclui', async () => {
    vi.spyOn(api, 'aceitarMovimentacao').mockRejectedValue({
      isAxiosError: true,
      response: {
        data: { error: { message: 'Senha incorreta. Confirme a sua senha para assinar.' } },
      },
    });
    const botao = await abrirAceite();

    for (const caixa of screen.getAllByRole('checkbox')) await userEvent.click(caixa);
    const campo = screen.getByLabelText('Confirme sua senha para assinar');
    await userEvent.type(campo, 'errada');
    await userEvent.click(botao);

    expect(await screen.findByRole('alert')).toHaveTextContent('Senha incorreta');
    expect(campo).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Assinar e concluir' })).toBeDisabled();
  });

  it('quem não pode aceitar (não é o recebedor) não vê o formulário', async () => {
    vi.spyOn(api, 'buscarMovimentacao').mockResolvedValue(
      buildDetalhe({ permissoes: { aceitar: false, cancelar: true, retificar: true } }),
    );

    renderPage();

    await screen.findByRole('heading', { name: /Termo de Responsabilidade/ });
    expect(screen.queryByText('Conferência e aceite')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar este registro' })).toBeInTheDocument();
  });
});

describe('MovimentacaoPage — cancelar e retificar', () => {
  it('cancelar pede confirmação e depois atualiza o documento', async () => {
    const cancelar = vi.spyOn(api, 'cancelarMovimentacao').mockResolvedValue(
      buildDetalhe({
        status: 'CANCELADA',
        permissoes: { aceitar: false, cancelar: false, retificar: false },
      }),
    );
    vi.spyOn(api, 'buscarMovimentacao').mockResolvedValue(
      buildDetalhe({ permissoes: { aceitar: false, cancelar: true, retificar: true } }),
    );

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar este registro' }));
    expect(cancelar).not.toHaveBeenCalled(); // ainda é só a primeira etapa
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));

    expect(cancelar).toHaveBeenCalledWith('mov-1');
    expect(await screen.findByText('Registro cancelado antes do aceite.')).toBeInTheDocument();
  });

  it('retificação exige texto e entra no histórico sem apagar o original', async () => {
    const retificar = vi.spyOn(api, 'retificarMovimentacao').mockResolvedValue(
      buildDetalhe({
        ...concluida,
        eventos: [
          ...buildDetalhe().eventos,
          {
            id: 'e-2',
            acao: 'RETIFICACAO',
            detalhe: 'O risco já existia antes da retirada.',
            createdAt: '2026-10-27T17:00:00.000Z',
            usuario: { id: 'locatario-1', nome: 'Carla Locataria' },
          },
        ],
      }),
    );
    vi.spyOn(api, 'buscarMovimentacao').mockResolvedValue(buildDetalhe(concluida));

    renderPage();
    const botao = await screen.findByRole('button', { name: 'Registrar retificação' });
    expect(botao).toBeDisabled();

    await userEvent.type(
      screen.getByLabelText('Descreva a correção'),
      'O risco já existia antes da retirada.',
    );
    await userEvent.click(botao);

    expect(retificar).toHaveBeenCalledWith('mov-1', 'O risco já existia antes da retirada.');
    const historico = (await screen.findByText('Histórico e retificações')).closest('section')!;
    expect(within(historico).getByText('Retificação')).toBeInTheDocument();
    expect(
      within(historico).getByText('O risco já existia antes da retirada.'),
    ).toBeInTheDocument();
    // o conteúdo original segue lá
    expect(screen.getByText('Pequeno risco na lateral')).toBeInTheDocument();
  });
});
