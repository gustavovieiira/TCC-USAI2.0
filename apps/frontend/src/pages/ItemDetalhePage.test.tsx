import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ItemDetalhePage } from './ItemDetalhePage';
import * as itensApi from '@/features/itens/itens.api';
import * as locacoesApi from '@/features/locacoes/locacoes.api';
import * as authStorage from '@/lib/authStorage';
import { ItemDTO } from '@/features/itens/itens.types';

const itemBase: ItemDTO = {
  id: 'item-1',
  titulo: 'Furadeira Bosch',
  descricao: 'Furadeira de impacto em ótimo estado',
  categoria: 'Ferramentas',
  valorDiaria: 20,
  ativo: true,
  ownerId: 'user-dono',
  condominioId: 'cond-1',
  imagens: [],
  createdAt: '2026-09-15T00:00:00.000Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/itens/item-1']}>
      <Routes>
        <Route path="/itens/:id" element={<ItemDetalhePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ItemDetalhePage', () => {
  it('exibe os dados do item', async () => {
    vi.spyOn(itensApi, 'buscarItem').mockResolvedValue(itemBase);
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue(null);

    renderPage();

    expect(await screen.findByText('Furadeira Bosch')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?20/)).toBeInTheDocument();
  });

  it('esconde o formulário de solicitação quando o usuário é o dono do item (RN04)', async () => {
    vi.spyOn(itensApi, 'buscarItem').mockResolvedValue(itemBase);
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-dono',
      nome: 'Ana',
      email: 'ana@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
      apartamento: null,
    });

    renderPage();

    await screen.findByText('Furadeira Bosch');
    expect(screen.getByText(/Este item é seu/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Solicitar locação' })).not.toBeInTheDocument();
  });

  it('calcula o valor estimado e envia a solicitação de locação', async () => {
    vi.spyOn(itensApi, 'buscarItem').mockResolvedValue(itemBase);
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-locatario',
      nome: 'Bruno',
      email: 'bruno@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
      apartamento: null,
    });
    const solicitar = vi
      .spyOn(locacoesApi, 'solicitarLocacao')
      .mockResolvedValue({ ...itemBase, id: 'locacao-1' } as never);

    renderPage();
    await screen.findByText('Furadeira Bosch');

    const [inicio, fim] = screen.getAllByDisplayValue('');
    await userEvent.type(inicio, '2026-10-01');
    await userEvent.type(fim, '2026-10-03');

    expect(await screen.findByText(/2 diárias/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?40/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Solicitar locação' }));

    expect(solicitar).toHaveBeenCalledWith({
      itemId: 'item-1',
      dataInicio: '2026-10-01',
      dataFim: '2026-10-03',
    });
    expect(await screen.findByText('Solicitação enviada!')).toBeInTheDocument();
  });
});

describe('ItemDetalhePage — identificação do bem e finalidade', () => {
  const morador = {
    id: 'user-locatario',
    nome: 'Bruno',
    email: 'bruno@example.com',
    papel: 'MORADOR' as const,
    condominioId: 'cond-1',
    apartamento: null,
  };

  it('mostra fabricante, modelo, nº de série e acessórios quando informados', async () => {
    vi.spyOn(itensApi, 'buscarItem').mockResolvedValue({
      ...itemBase,
      fabricante: 'Bosch',
      modelo: 'GSB 13 RE',
      numeroSerie: 'SN-123',
      acessorios: ['Maleta', 'Jogo de brocas'],
    });
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue(morador);

    renderPage();

    expect(await screen.findByText('Identificação do bem')).toBeInTheDocument();
    expect(screen.getByText('Bosch')).toBeInTheDocument();
    expect(screen.getByText('GSB 13 RE')).toBeInTheDocument();
    expect(screen.getByText('SN-123')).toBeInTheDocument();
    expect(screen.getByText('Maleta')).toBeInTheDocument();
    expect(screen.getByText('Jogo de brocas')).toBeInTheDocument();
  });

  it('item sem identificação não mostra o bloco vazio', async () => {
    vi.spyOn(itensApi, 'buscarItem').mockResolvedValue(itemBase);
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue(morador);

    renderPage();

    await screen.findByText('Furadeira Bosch');
    expect(screen.queryByText('Identificação do bem')).not.toBeInTheDocument();
  });

  it('envia a finalidade informada no pedido; em branco, não envia nada', async () => {
    vi.spyOn(itensApi, 'buscarItem').mockResolvedValue(itemBase);
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue(morador);
    const solicitar = vi.spyOn(locacoesApi, 'solicitarLocacao').mockResolvedValue({} as never);

    renderPage();
    await screen.findByText('Furadeira Bosch');
    await userEvent.type(screen.getByLabelText('De'), '2030-05-10');
    await userEvent.type(screen.getByLabelText('Até'), '2030-05-12');
    await userEvent.type(screen.getByLabelText(/Finalidade do uso/), '  Pendurar quadros  ');
    await userEvent.click(screen.getByRole('button', { name: 'Solicitar locação' }));

    expect(solicitar).toHaveBeenCalledWith({
      itemId: 'item-1',
      dataInicio: '2030-05-10',
      dataFim: '2030-05-12',
      finalidade: 'Pendurar quadros',
    });
  });
});
