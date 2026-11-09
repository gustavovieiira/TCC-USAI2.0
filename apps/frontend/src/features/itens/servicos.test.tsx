import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ItemDetalhePage } from '@/pages/ItemDetalhePage';
import * as conversasApi from '@/features/conversas/conversas.api';
import * as authStorage from '@/lib/authStorage';
import { ehServico, rotuloDoCampoDeValor, sufixoDoValor, tipoDe, unidadeDe } from './anuncio';
import { GerenciarAnuncio } from './GerenciarAnuncio';
import { ItemCard } from './ItemCard';
import * as itensApi from './itens.api';
import { ItemDTO } from './itens.types';

afterEach(() => vi.restoreAllMocks());

const servico: ItemDTO = {
  id: 'serv-1',
  tipo: 'SERVICO',
  unidadeCobranca: 'HORA',
  titulo: 'Eletricista residencial',
  descricao: 'Tomadas, chuveiros e troca de disjuntores',
  categoria: 'Elétrica',
  valorDiaria: 80,
  ativo: true,
  ownerId: 'prestador-1',
  condominioId: 'cond-1',
  imagens: [],
  createdAt: '2026-11-09T00:00:00.000Z',
  proprietario: { nome: 'Raquel Vieira', apartamento: '12' },
};

const itemAntigo: ItemDTO = {
  id: 'item-1',
  titulo: 'Furadeira Bosch',
  descricao: 'Furadeira de impacto em ótimo estado',
  categoria: 'Ferramentas',
  valorDiaria: 20,
  ativo: true,
  ownerId: 'dono-1',
  condominioId: 'cond-1',
  imagens: [],
  createdAt: '2026-09-15T00:00:00.000Z',
};

describe('anuncio (tipo e unidade de cobrança)', () => {
  it('anúncio antigo, sem tipo, é um item cobrado por dia', () => {
    expect(tipoDe(itemAntigo)).toBe('ITEM');
    expect(unidadeDe(itemAntigo)).toBe('DIA');
    expect(ehServico(itemAntigo)).toBe(false);
    expect(sufixoDoValor(itemAntigo)).toBe('/ dia');
  });

  it('serviço é cobrado por hora ou por serviço', () => {
    expect(ehServico(servico)).toBe(true);
    expect(sufixoDoValor(servico)).toBe('/ hora');
    expect(sufixoDoValor({ ...servico, unidadeCobranca: 'SERVICO' })).toBe('por serviço');
  });

  it('o rótulo do campo de valor muda conforme o tipo', () => {
    expect(rotuloDoCampoDeValor('ITEM', 'DIA')).toBe('Valor por diária (R$)');
    expect(rotuloDoCampoDeValor('SERVICO', 'HORA')).toBe('Valor por hora (R$)');
    expect(rotuloDoCampoDeValor('SERVICO', 'SERVICO')).toBe('Valor do serviço (R$)');
  });
});

describe('ItemCard', () => {
  it('serviço traz a etiqueta "Serviço" e o valor por hora', () => {
    render(
      <MemoryRouter>
        <ItemCard item={servico} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Serviço')).toBeInTheDocument();
    expect(screen.getByText('/ hora')).toBeInTheDocument();
  });

  it('item não traz etiqueta e continua por dia', () => {
    render(
      <MemoryRouter>
        <ItemCard item={itemAntigo} />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Serviço')).not.toBeInTheDocument();
    expect(screen.getByText('/ dia')).toBeInTheDocument();
  });
});

describe('detalhe de um serviço', () => {
  function renderizar(userId: string) {
    vi.spyOn(itensApi, 'buscarItem').mockResolvedValue(servico);
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: userId,
      nome: 'Alguém',
      email: 'alguem@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
      apartamento: null,
    });
    return render(
      <MemoryRouter initialEntries={['/itens/serv-1']}>
        <Routes>
          <Route path="/itens/:id" element={<ItemDetalhePage />} />
          <Route path="/conversas/:id" element={<p>Chat aberto</p>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('mostra quem presta e o valor por hora, sem formulário de locação', async () => {
    renderizar('morador-interessado');

    expect(await screen.findByText('Eletricista residencial')).toBeInTheDocument();
    expect(screen.getByText('/ hora')).toBeInTheDocument();
    expect(screen.getByText('Raquel Vieira')).toBeInTheDocument();
    expect(screen.getByText(/Apto 12/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Contratar este serviço' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Solicitar locação' })).not.toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/não cobra nem recebe pelo serviço/);
  });

  it('o botão Conversar abre o chat privado com quem presta', async () => {
    const abrir = vi.spyOn(conversasApi, 'abrirConversa').mockResolvedValue({
      id: 'conv-9',
    } as Awaited<ReturnType<typeof conversasApi.abrirConversa>>);
    renderizar('morador-interessado');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Conversar com Raquel Vieira' }),
    );

    expect(abrir).toHaveBeenCalledWith({ usuarioId: 'prestador-1', postOrigemId: undefined });
    expect(await screen.findByText('Chat aberto')).toBeInTheDocument();
  });

  it('quem presta vê as opções de gerenciar, não o botão de contratar', async () => {
    renderizar('prestador-1');

    expect(await screen.findByText(/Este serviço é seu/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar anúncio' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Contratar este serviço' }),
    ).not.toBeInTheDocument();
  });
});

describe('editar um serviço', () => {
  function renderizar(aoAtualizar = vi.fn()) {
    render(
      <MemoryRouter>
        <GerenciarAnuncio item={servico} aoAtualizar={aoAtualizar} aoRemover={vi.fn()} />
      </MemoryRouter>,
    );
    return aoAtualizar;
  }

  it('muda o valor e a forma de cobrança, sem o piso de R$ 5,00', async () => {
    const atualizado = { ...servico, valorDiaria: 3, unidadeCobranca: 'SERVICO' as const };
    const atualizar = vi.spyOn(itensApi, 'atualizarItem').mockResolvedValue(atualizado);
    const aoAtualizar = renderizar();

    await userEvent.click(screen.getByRole('button', { name: 'Editar anúncio' }));
    await userEvent.click(screen.getByRole('button', { name: /Por serviço/ }));
    const valor = screen.getByLabelText('Valor do serviço (R$)');
    await userEvent.clear(valor);
    await userEvent.type(valor, '3');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(atualizar).toHaveBeenCalledWith(
      'serv-1',
      expect.objectContaining({ valorDiaria: 3, unidadeCobranca: 'SERVICO' }),
    );
    expect(aoAtualizar).toHaveBeenCalledWith(atualizado);
  });

  it('recusa valor zero', async () => {
    const atualizar = vi.spyOn(itensApi, 'atualizarItem');
    renderizar();

    await userEvent.click(screen.getByRole('button', { name: 'Editar anúncio' }));
    const valor = screen.getByLabelText('Valor por hora (R$)');
    await userEvent.clear(valor);
    await userEvent.type(valor, '0');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Informe um valor maior que zero.');
    expect(atualizar).not.toHaveBeenCalled();
  });
});
