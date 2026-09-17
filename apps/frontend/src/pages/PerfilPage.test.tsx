import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PerfilPage } from './PerfilPage';
import * as adminApi from '@/features/admin/admin.api';
import * as itensApi from '@/features/itens/itens.api';
import * as locacoesApi from '@/features/locacoes/locacoes.api';
import * as saquesApi from '@/features/saques/saques.api';
import * as sindicoApi from '@/features/sindico/sindico.api';
import * as authStorage from '@/lib/authStorage';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/perfil']}>
      <Routes>
        <Route path="/perfil" element={<PerfilPage />} />
        <Route path="/login" element={<p>Página de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PerfilPage', () => {
  it('mostra os dados da conta e as estatísticas de um morador', async () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-1',
      nome: 'Ana Proprietaria',
      email: 'ana@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
      apartamento: '101',
    });
    vi.spyOn(saquesApi, 'buscarSaldo').mockResolvedValue(300);
    vi.spyOn(itensApi, 'listarItens').mockResolvedValue([
      {
        id: 'item-1',
        titulo: 'Furadeira',
        descricao: '',
        categoria: 'Ferramentas',
        valorDiaria: 10,
        ativo: true,
        ownerId: 'user-1',
        condominioId: 'cond-1',
        imagens: [],
        createdAt: '2026-09-01T00:00:00.000Z',
      },
    ]);
    vi.spyOn(locacoesApi, 'listarComoLocatario').mockResolvedValue([
      {
        id: 'loc-1',
        itemId: 'item-2',
        locatarioId: 'user-1',
        dataInicio: '2026-09-01T00:00:00.000Z',
        dataFim: '2026-09-03T00:00:00.000Z',
        valorTotal: 40,
        status: 'APROVADA',
        createdAt: '2026-09-01T00:00:00.000Z',
        item: { id: 'item-2', titulo: 'Escada', valorDiaria: 20, ownerId: 'user-2' },
      },
    ]);
    vi.spyOn(locacoesApi, 'listarComoProprietario').mockResolvedValue([
      {
        id: 'loc-2',
        itemId: 'item-1',
        locatarioId: 'user-3',
        dataInicio: '2026-09-05T00:00:00.000Z',
        dataFim: '2026-09-06T00:00:00.000Z',
        valorTotal: 10,
        status: 'PENDENTE',
        createdAt: '2026-09-05T00:00:00.000Z',
        item: { id: 'item-1', titulo: 'Furadeira', valorDiaria: 10, ownerId: 'user-1' },
      },
    ]);

    renderPage();

    expect(screen.getByText('Ana Proprietaria')).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText('Apartamento 101')).toBeInTheDocument();

    expect(await screen.findByText(/300,00/)).toBeInTheDocument();
    expect(screen.getByText('Itens publicados').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Locações ativas').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Pedidos p/ aprovar').nextSibling).toHaveTextContent('1');
  });

  it('mostra as estatísticas do síndico', async () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-sindico',
      nome: 'Carla Síndica',
      email: 'carla@example.com',
      papel: 'SINDICO',
      condominioId: 'cond-1',
      apartamento: null,
    });
    vi.spyOn(sindicoApi, 'buscarCondominio').mockResolvedValue({
      id: 'cond-1',
      nome: 'Residencial Jardim Europa',
      linkSlug: 'residencial-jardim-europa',
      pin: '1234',
      ativo: true,
    });
    vi.spyOn(sindicoApi, 'listarMoradores').mockResolvedValue([
      {
        id: 'u1',
        nome: 'Ana',
        email: 'ana@example.com',
        apartamento: '101',
        createdAt: '2026-09-01T00:00:00.000Z',
      },
    ]);
    vi.spyOn(sindicoApi, 'listarLocacoesAtivas').mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Residencial Jardim Europa')).toBeInTheDocument();
    expect(screen.getByText('Moradores').nextSibling).toHaveTextContent('1');
  });

  it('mostra as estatísticas do admin', async () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-admin',
      nome: 'Admin USAI',
      email: 'admin@usai.local',
      papel: 'ADMIN',
      condominioId: null,
      apartamento: null,
    });
    vi.spyOn(adminApi, 'resumoFinanceiro').mockResolvedValue({
      saques: {
        pendente: { quantidade: 2, valorTotal: 150 },
        aprovado: { quantidade: 0, valorTotal: 0 },
        rejeitado: { quantidade: 0, valorTotal: 0 },
      },
      condominiosAtivos: 3,
    });
    vi.spyOn(adminApi, 'listarCondominios').mockResolvedValue([
      {
        id: 'c1',
        nome: 'A',
        linkSlug: 'a',
        pin: '1',
        ativo: true,
        createdAt: '2026-09-01T00:00:00.000Z',
      },
      {
        id: 'c2',
        nome: 'B',
        linkSlug: 'b',
        pin: '2',
        ativo: true,
        createdAt: '2026-09-01T00:00:00.000Z',
      },
    ]);

    renderPage();

    expect((await screen.findByText('Condomínios ativos')).nextSibling).toHaveTextContent('2');
    expect(screen.getByText('Saques pendentes').nextSibling).toHaveTextContent('2');
  });

  it('desloga e redireciona pro login ao clicar em Sair', async () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-1',
      nome: 'Ana Proprietaria',
      email: 'ana@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
      apartamento: null,
    });
    const clearSession = vi.spyOn(authStorage, 'clearSession');
    vi.spyOn(saquesApi, 'buscarSaldo').mockResolvedValue(0);
    vi.spyOn(itensApi, 'listarItens').mockResolvedValue([]);
    vi.spyOn(locacoesApi, 'listarComoLocatario').mockResolvedValue([]);
    vi.spyOn(locacoesApi, 'listarComoProprietario').mockResolvedValue([]);

    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(clearSession).toHaveBeenCalled();
    expect(await screen.findByText('Página de login')).toBeInTheDocument();
  });
});
