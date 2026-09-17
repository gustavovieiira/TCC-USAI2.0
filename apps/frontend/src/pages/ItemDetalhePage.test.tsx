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
