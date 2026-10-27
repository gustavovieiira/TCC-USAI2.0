import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MovimentacoesLocacao } from './MovimentacoesLocacao';
import { buildResumo } from './fixtures';
import * as api from './movimentacoes.api';
import { LocacaoDTO } from '@/features/locacoes/locacoes.types';

function buildLocacao(overrides: Partial<LocacaoDTO> = {}): LocacaoDTO {
  return {
    id: 'loc-1',
    itemId: 'item-1',
    locatarioId: 'locatario-1',
    dataInicio: '2026-11-01T00:00:00.000Z',
    dataFim: '2026-11-03T00:00:00.000Z',
    valorTotal: 100,
    status: 'PAGA',
    createdAt: '2026-10-20T00:00:00.000Z',
    item: {
      id: 'item-1',
      titulo: 'Projetor Epson',
      valorDiaria: 50,
      ownerId: 'dono-1',
      acessorios: ['Controle remoto', 'Cabo HDMI'],
    },
    ...overrides,
  };
}

function renderSecao(locacao: LocacaoDTO, userId: string) {
  return render(
    <MemoryRouter>
      <MovimentacoesLocacao locacao={locacao} userId={userId} />
    </MemoryRouter>,
  );
}

describe('MovimentacoesLocacao — quem faz o quê', () => {
  it('locação PAGA sem retirada: o DONO vê "Registrar entrega"', async () => {
    vi.spyOn(api, 'listarMovimentacoesDaLocacao').mockResolvedValue([]);

    renderSecao(buildLocacao(), 'dono-1');

    expect(await screen.findByRole('button', { name: 'Registrar entrega' })).toBeInTheDocument();
    expect(screen.getByText(/Registre a entrega do item ao locatário/)).toBeInTheDocument();
  });

  it('locação PAGA: o LOCATÁRIO só espera o dono registrar (sem botão)', async () => {
    vi.spyOn(api, 'listarMovimentacoesDaLocacao').mockResolvedValue([]);

    renderSecao(buildLocacao(), 'locatario-1');

    expect(
      await screen.findByText(/Aguardando o proprietário registrar a entrega/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar/ })).not.toBeInTheDocument();
  });

  it('locação EM_ANDAMENTO: o LOCATÁRIO vê "Registrar devolução"; o dono não', async () => {
    vi.spyOn(api, 'listarMovimentacoesDaLocacao').mockResolvedValue([
      buildResumo({ status: 'CONCLUIDA' }),
    ]);
    const em = buildLocacao({ status: 'EM_ANDAMENTO' });

    const { unmount } = renderSecao(em, 'locatario-1');
    expect(await screen.findByRole('button', { name: 'Registrar devolução' })).toBeInTheDocument();
    unmount();

    renderSecao(em, 'dono-1');
    await screen.findByText(/USAI-2026-000007/);
    expect(screen.queryByRole('button', { name: /Registrar/ })).not.toBeInTheDocument();
  });

  it('não oferece nova entrega quando já existe uma (aguardando ou concluída), mas oferece depois de cancelada', async () => {
    const listar = vi.spyOn(api, 'listarMovimentacoesDaLocacao');

    listar.mockResolvedValue([buildResumo({ status: 'AGUARDANDO_ACEITE' })]);
    const { unmount } = renderSecao(buildLocacao(), 'dono-1');
    await screen.findByText(/USAI-2026-000007/);
    expect(screen.queryByRole('button', { name: 'Registrar entrega' })).not.toBeInTheDocument();
    unmount();

    listar.mockResolvedValue([buildResumo({ status: 'CANCELADA' })]);
    renderSecao(buildLocacao(), 'dono-1');
    expect(await screen.findByRole('button', { name: 'Registrar entrega' })).toBeInTheDocument();
  });

  it('quem precisa aceitar vê o convite com link pro documento', async () => {
    vi.spyOn(api, 'listarMovimentacoesDaLocacao').mockResolvedValue([buildResumo()]);

    renderSecao(buildLocacao(), 'locatario-1');

    const convite = await screen.findByRole('link', { name: /Confira e aceite o termo/ });
    expect(convite).toHaveAttribute('href', '/movimentacoes/mov-1');
    expect(screen.getByText('Aguardando aceite')).toBeInTheDocument();
  });

  it('em locação ainda não paga (ou cancelada) a seção nem aparece e nada é consultado', () => {
    const listar = vi.spyOn(api, 'listarMovimentacoesDaLocacao');

    for (const status of ['PENDENTE', 'APROVADA', 'CANCELADA'] as const) {
      const { container, unmount } = renderSecao(buildLocacao({ status }), 'dono-1');
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
    expect(listar).not.toHaveBeenCalled();
  });

  it('o botão abre o formulário de registro com os acessórios do item', async () => {
    vi.spyOn(api, 'listarMovimentacoesDaLocacao').mockResolvedValue([]);

    renderSecao(buildLocacao(), 'dono-1');
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar entrega' }));

    const dialogo = await screen.findByRole('dialog', { name: 'Registrar a entrega do item' });
    expect(dialogo).toHaveTextContent('Projetor Epson');
    expect(screen.getByLabelText('Controle remoto')).not.toBeChecked();
    expect(screen.getByLabelText('Cabo HDMI')).not.toBeChecked();
  });
});

describe('RegistrarMovimentacaoModal (via a seção da locação)', () => {
  async function abrir(locacao = buildLocacao(), userId = 'dono-1') {
    vi.spyOn(api, 'listarMovimentacoesDaLocacao').mockResolvedValue([]);
    renderSecao(locacao, userId);
    await userEvent.click(
      await screen.findByRole('button', {
        name: userId === 'dono-1' ? 'Registrar entrega' : 'Registrar devolução',
      }),
    );
  }

  it('estado de conservação é obrigatório', async () => {
    const registrar = vi.spyOn(api, 'registrarMovimentacao');
    await abrir();

    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Registrar entrega' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Informe o estado de conservação');
    expect(registrar).not.toHaveBeenCalled();
  });

  it('envia estado, acessórios conferidos (só os marcados) e observações; depois recarrega a lista', async () => {
    const registrar = vi.spyOn(api, 'registrarMovimentacao').mockResolvedValue(buildResumo());
    await abrir();

    await userEvent.selectOptions(screen.getByLabelText('Estado de conservação'), 'BOM');
    await userEvent.click(screen.getByLabelText('Controle remoto'));
    await userEvent.type(screen.getByLabelText(/Observações adicionais/), 'Risco leve na lateral');
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Registrar entrega' }),
    );

    expect(registrar).toHaveBeenCalledWith('loc-1', {
      tipo: 'RETIRADA',
      estadoConservacao: 'BOM',
      acessorios: [
        { nome: 'Controle remoto', conferido: true },
        { nome: 'Cabo HDMI', conferido: false },
      ],
      observacoes: 'Risco leve na lateral',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('permite acrescentar um acessório que não estava cadastrado, já conferido, sem duplicar', async () => {
    const registrar = vi.spyOn(api, 'registrarMovimentacao').mockResolvedValue(buildResumo());
    await abrir();

    await userEvent.type(screen.getByLabelText('Outro acessório'), 'Bolsa de transporte');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(screen.getByLabelText('Bolsa de transporte')).toBeChecked();

    await userEvent.type(screen.getByLabelText('Outro acessório'), 'cabo hdmi');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('já está na lista');

    await userEvent.selectOptions(screen.getByLabelText('Estado de conservação'), 'OTIMO');
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Registrar entrega' }),
    );

    expect(registrar.mock.calls[0][1].acessorios).toContainEqual({
      nome: 'Bolsa de transporte',
      conferido: true,
    });
    expect(registrar.mock.calls[0][1].acessorios).toHaveLength(3);
  });

  it('a devolução usa os textos e o tipo DEVOLUCAO', async () => {
    const registrar = vi.spyOn(api, 'registrarMovimentacao').mockResolvedValue(buildResumo());
    await abrir(buildLocacao({ status: 'EM_ANDAMENTO' }), 'locatario-1');

    expect(
      screen.getByRole('dialog', { name: 'Registrar a devolução do item' }),
    ).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Estado de conservação'), 'REGULAR');
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Registrar devolução' }),
    );

    expect(registrar.mock.calls[0][1].tipo).toBe('DEVOLUCAO');
  });

  it('mostra o erro do servidor e mantém o formulário aberto', async () => {
    vi.spyOn(api, 'registrarMovimentacao').mockRejectedValue({
      isAxiosError: true,
      response: {
        data: { error: { message: 'Já existe um registro de retirada para esta locação' } },
      },
    });
    await abrir();

    await userEvent.selectOptions(screen.getByLabelText('Estado de conservação'), 'BOM');
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Registrar entrega' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe um registro de retirada');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('cancelar fecha sem registrar', async () => {
    const registrar = vi.spyOn(api, 'registrarMovimentacao');
    await abrir();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(registrar).not.toHaveBeenCalled();
  });
});
