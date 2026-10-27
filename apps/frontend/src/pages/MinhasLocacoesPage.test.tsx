import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MinhasLocacoesPage } from './MinhasLocacoesPage';
import * as locacoesApi from '@/features/locacoes/locacoes.api';
import { LocacaoDTO } from '@/features/locacoes/locacoes.types';
import * as conversasApi from '@/features/conversas/conversas.api';
import * as movimentacoesApi from '@/features/movimentacoes/movimentacoes.api';
import * as authStorage from '@/lib/authStorage';
import * as pagamentosApi from '@/features/pagamentos/pagamentos.api';

function buildLocacao(overrides: Partial<LocacaoDTO> = {}): LocacaoDTO {
  return {
    id: 'locacao-1',
    itemId: 'item-1',
    locatarioId: 'user-2',
    dataInicio: '2026-10-01T00:00:00.000Z',
    dataFim: '2026-10-03T00:00:00.000Z',
    valorTotal: 40,
    status: 'PENDENTE',
    createdAt: '2026-09-15T00:00:00.000Z',
    item: { id: 'item-1', titulo: 'Furadeira Bosch', valorDiaria: 20, ownerId: 'user-1' },
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/locacoes']}>
      <Routes>
        <Route path="/locacoes" element={<MinhasLocacoesPage />} />
        <Route path="/conversas/:id" element={<p>Tela da conversa</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MinhasLocacoesPage', () => {
  it('mostra as locações como locatário por padrão', async () => {
    vi.spyOn(locacoesApi, 'listarComoLocatario').mockResolvedValue([buildLocacao()]);
    vi.spyOn(locacoesApi, 'listarComoProprietario').mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Furadeira Bosch')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mensagens' })).toBeInTheDocument();
  });

  it('"Mensagens" abre o chat da locação na página de Conversas', async () => {
    vi.spyOn(locacoesApi, 'listarComoLocatario').mockResolvedValue([buildLocacao()]);
    vi.spyOn(locacoesApi, 'listarComoProprietario').mockResolvedValue([]);
    const abrir = vi.spyOn(conversasApi, 'abrirConversaDaLocacao').mockResolvedValue({
      id: 'conversa-loc',
      outroParticipante: { id: 'user-1', nome: 'Ana Proprietaria', papel: 'MORADOR' },
      postOrigemId: null,
      locacao: { id: 'locacao-1', itemTitulo: 'Furadeira Bosch', status: 'PENDENTE' },
      createdAt: '2026-09-15T00:00:00.000Z',
      expiraEm: null,
      ultimaMensagem: null,
      naoLidas: 0,
    });

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Mensagens' }));

    expect(abrir).toHaveBeenCalledWith('locacao-1');
    expect(await screen.findByText('Tela da conversa')).toBeInTheDocument();
  });

  it('mostra o erro quando não consegue abrir o chat da locação', async () => {
    vi.spyOn(locacoesApi, 'listarComoLocatario').mockResolvedValue([buildLocacao()]);
    vi.spyOn(locacoesApi, 'listarComoProprietario').mockResolvedValue([]);
    vi.spyOn(conversasApi, 'abrirConversaDaLocacao').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'Você não participa desta locação' } } },
    });

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Mensagens' }));

    expect(await screen.findByText('Você não participa desta locação')).toBeInTheDocument();
  });

  it('mostra aprovar/rejeitar para locações pendentes recebidas', async () => {
    vi.spyOn(locacoesApi, 'listarComoLocatario').mockResolvedValue([]);
    vi.spyOn(locacoesApi, 'listarComoProprietario').mockResolvedValue([buildLocacao()]);

    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Recebidas' }));

    expect(await screen.findByText('Furadeira Bosch')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rejeitar' })).toBeInTheDocument();
  });

  it('aprova a locação e atualiza o status na tela', async () => {
    vi.spyOn(locacoesApi, 'listarComoLocatario').mockResolvedValue([]);
    vi.spyOn(locacoesApi, 'listarComoProprietario').mockResolvedValue([buildLocacao()]);
    vi.spyOn(locacoesApi, 'aprovarLocacao').mockResolvedValue(buildLocacao({ status: 'APROVADA' }));

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Recebidas' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Aprovar' }));

    expect(await screen.findByText('Aprovada')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument(),
    );
  });

  it('não mostra ações de aprovação para locações que não estão pendentes', async () => {
    vi.spyOn(locacoesApi, 'listarComoLocatario').mockResolvedValue([]);
    vi.spyOn(locacoesApi, 'listarComoProprietario').mockResolvedValue([
      buildLocacao({ status: 'CANCELADA' }),
    ]);

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Recebidas' }));

    await screen.findByText('Cancelada');
    expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument();
  });

  it('mostra "Pagar agora" pra locação aprovada e abre o link do Asaas numa aba nova', async () => {
    vi.spyOn(locacoesApi, 'listarComoLocatario').mockResolvedValue([
      buildLocacao({ status: 'APROVADA' }),
    ]);
    vi.spyOn(locacoesApi, 'listarComoProprietario').mockResolvedValue([]);
    vi.spyOn(pagamentosApi, 'criarCobranca').mockResolvedValue({
      invoiceUrl: 'https://sandbox.asaas.com/i/pay_123',
    });
    const windowOpen = vi.spyOn(window, 'open').mockImplementation(() => null);

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Pagar agora' }));

    expect(pagamentosApi.criarCobranca).toHaveBeenCalledWith('locacao-1');
    expect(windowOpen).toHaveBeenCalledWith(
      'https://sandbox.asaas.com/i/pay_123',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('não mostra "Pagar agora" pra locação ainda pendente', async () => {
    vi.spyOn(locacoesApi, 'listarComoLocatario').mockResolvedValue([buildLocacao()]);
    vi.spyOn(locacoesApi, 'listarComoProprietario').mockResolvedValue([]);

    renderPage();
    await screen.findByText('Furadeira Bosch');

    expect(screen.queryByRole('button', { name: 'Pagar agora' })).not.toBeInTheDocument();
  });
});

describe('MinhasLocacoesPage — finalidade e retirada/devolução', () => {
  it('mostra a finalidade do uso informada no pedido', async () => {
    vi.spyOn(locacoesApi, 'listarComoLocatario').mockResolvedValue([]);
    vi.spyOn(locacoesApi, 'listarComoProprietario').mockResolvedValue([
      buildLocacao({ finalidade: 'Sessão de cinema no salão de festas' }),
    ]);

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Recebidas' }));

    expect(await screen.findByText(/Sessão de cinema no salão de festas/)).toBeInTheDocument();
  });

  it('locação paga mostra a seção de retirada e devolução (o dono vê o botão de registrar a entrega)', async () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-1',
      nome: 'Dono',
      email: 'dono@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
      apartamento: null,
    });
    vi.spyOn(movimentacoesApi, 'listarMovimentacoesDaLocacao').mockResolvedValue([]);
    vi.spyOn(locacoesApi, 'listarComoLocatario').mockResolvedValue([]);
    vi.spyOn(locacoesApi, 'listarComoProprietario').mockResolvedValue([
      buildLocacao({ status: 'PAGA' }),
    ]);

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Recebidas' }));

    expect(await screen.findByText('Retirada e devolução')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Registrar entrega' })).toBeInTheDocument();
  });

  it('locação pendente não mostra a seção de retirada e devolução', async () => {
    vi.spyOn(locacoesApi, 'listarComoLocatario').mockResolvedValue([
      buildLocacao({ status: 'PENDENTE' }),
    ]);
    vi.spyOn(locacoesApi, 'listarComoProprietario').mockResolvedValue([]);

    renderPage();

    await screen.findByText('Furadeira Bosch');
    expect(screen.queryByText('Retirada e devolução')).not.toBeInTheDocument();
  });
});
