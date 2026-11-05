import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SindicoPage } from './SindicoPage';
import * as assinaturasApi from '@/features/assinaturas/assinaturas.api';
import * as sindicoApi from '@/features/sindico/sindico.api';
import { CondominioDTO, LocacaoAtivaDTO, MoradorDTO } from '@/features/sindico/sindico.types';

const condominio: CondominioDTO = {
  id: 'cond-1',
  nome: 'Residencial Jardim Europa',
  linkSlug: 'residencial-jardim-europa',
  pin: '1234',
  ativo: true,
};

const morador: MoradorDTO = {
  id: 'user-1',
  nome: 'Ana Proprietária',
  email: 'ana@example.com',
  apartamento: '101',
  createdAt: '2026-09-01T00:00:00.000Z',
};

const locacaoAtiva: LocacaoAtivaDTO = {
  id: 'locacao-1',
  status: 'APROVADA',
  dataInicio: '2026-10-01T00:00:00.000Z',
  dataFim: '2026-10-03T00:00:00.000Z',
  valorTotal: 40,
  item: { id: 'item-1', titulo: 'Furadeira Bosch', ownerId: 'user-1' },
  locatario: { id: 'user-2', nome: 'Bruno Locatário' },
};

function mockApis(overrides: { moradores?: MoradorDTO[]; locacoes?: LocacaoAtivaDTO[] } = {}) {
  vi.spyOn(assinaturasApi, 'buscarPainelAssinatura').mockResolvedValue(null);
  vi.spyOn(sindicoApi, 'buscarCondominio').mockResolvedValue(condominio);
  vi.spyOn(sindicoApi, 'listarMoradores').mockResolvedValue(overrides.moradores ?? [morador]);
  vi.spyOn(sindicoApi, 'listarLocacoesAtivas').mockResolvedValue(
    overrides.locacoes ?? [locacaoAtiva],
  );
}

describe('SindicoPage', () => {
  it('exibe os dados do condomínio e os moradores por padrão', async () => {
    mockApis();

    render(<SindicoPage />);

    expect(await screen.findByText('Residencial Jardim Europa')).toBeInTheDocument();
    // o PIN aparece no cartão de convite e no de alteração
    expect(screen.getAllByText('1234').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Ana Proprietária')).toBeInTheDocument();
  });

  it('busca moradores por nome, e-mail ou apartamento', async () => {
    mockApis({
      moradores: [
        morador,
        {
          ...morador,
          id: 'user-3',
          nome: 'Carla Souza',
          email: 'carla@example.com',
          apartamento: '202',
        },
      ],
    });

    render(<SindicoPage />);
    await screen.findByText('Ana Proprietária');

    const busca = screen.getByRole('searchbox', { name: 'Buscar morador' });
    await userEvent.type(busca, '202');
    expect(screen.queryByText('Ana Proprietária')).not.toBeInTheDocument();
    expect(screen.getByText('Carla Souza')).toBeInTheDocument();

    await userEvent.clear(busca);
    await userEvent.type(busca, 'zzz');
    expect(screen.getByText('Nenhum morador encontrado')).toBeInTheDocument();
  });

  it('mostra as locações ativas ao trocar de aba', async () => {
    mockApis();

    render(<SindicoPage />);
    await screen.findByText('Ana Proprietária');

    await userEvent.click(screen.getByRole('button', { name: /Locações ativas/ }));

    expect(await screen.findByText('Furadeira Bosch')).toBeInTheDocument();
  });

  it('altera o PIN do condomínio', async () => {
    mockApis();
    vi.spyOn(sindicoApi, 'atualizarPin').mockResolvedValue({ ...condominio, pin: '5678' });

    render(<SindicoPage />);
    await screen.findAllByText('1234');

    await userEvent.click(screen.getByRole('button', { name: 'Alterar PIN' }));
    await userEvent.type(screen.getByLabelText('Novo PIN'), '5678');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(sindicoApi.atualizarPin).toHaveBeenCalledWith('5678');
    expect((await screen.findAllByText('5678')).length).toBeGreaterThanOrEqual(1);
  });

  it('mostra estado vazio quando não há moradores', async () => {
    mockApis({ moradores: [] });

    render(<SindicoPage />);

    expect(await screen.findByText('Nenhum morador cadastrado ainda')).toBeInTheDocument();
  });

  it('remove um morador só depois de confirmar na janela', async () => {
    mockApis();
    vi.spyOn(sindicoApi, 'removerMorador').mockResolvedValue(undefined);

    render(<SindicoPage />);
    await screen.findByText('Ana Proprietária');

    await userEvent.click(screen.getByRole('button', { name: 'Remover' }));
    expect(sindicoApi.removerMorador).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Remover morador' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sim, remover' }));

    expect(sindicoApi.removerMorador).toHaveBeenCalledWith('user-1');
    await waitFor(() => expect(screen.queryByText('Ana Proprietária')).not.toBeInTheDocument());
  });

  it('não remove o morador se a pessoa cancelar na janela', async () => {
    mockApis();
    vi.spyOn(sindicoApi, 'removerMorador').mockResolvedValue(undefined);

    render(<SindicoPage />);
    await screen.findByText('Ana Proprietária');

    await userEvent.click(screen.getByRole('button', { name: 'Remover' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(sindicoApi.removerMorador).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Ana Proprietária')).toBeInTheDocument();
  });

  it('filtra os moradores que estão em locação agora (como dono ou como locatário)', async () => {
    mockApis({
      moradores: [
        morador,
        { ...morador, id: 'user-3', nome: 'Carla Souza', email: 'carla@example.com' },
      ],
    });

    render(<SindicoPage />);
    await screen.findByText('Carla Souza');

    await userEvent.click(screen.getByRole('button', { name: /Em locação agora/ }));

    expect(screen.getByText('Ana Proprietária')).toBeInTheDocument();
    expect(screen.queryByText('Carla Souza')).not.toBeInTheDocument();
  });

  it('nas locações, filtra por situação, busca por item e mostra o dono', async () => {
    mockApis({
      moradores: [morador],
      locacoes: [
        locacaoAtiva,
        {
          ...locacaoAtiva,
          id: 'locacao-2',
          status: 'EM_ANDAMENTO',
          item: { id: 'item-2', titulo: 'Escada de alumínio', ownerId: 'user-1' },
        },
      ],
    });

    render(<SindicoPage />);
    await screen.findByText('Ana Proprietária');
    await userEvent.click(screen.getByRole('button', { name: /Locações ativas/ }));

    expect(await screen.findByText('Furadeira Bosch')).toBeInTheDocument();
    expect(screen.getAllByText(/Dono Ana Proprietária, locatário Bruno Locatário/)).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: /Em andamento/ }));
    expect(screen.queryByText('Furadeira Bosch')).not.toBeInTheDocument();
    expect(screen.getByText('Escada de alumínio')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^Todas/ }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar locação' }), 'zzz');
    expect(screen.getByText('Nenhuma locação encontrada')).toBeInTheDocument();
  });

  it('desenha o prédio com uma janela acesa por morador', async () => {
    mockApis();

    render(<SindicoPage />);

    expect(await screen.findByRole('img', { name: '1 morador cadastrado' })).toBeInTheDocument();
  });
});
