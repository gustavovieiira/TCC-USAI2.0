import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CatalogoPage } from './CatalogoPage';
import * as itensApi from '@/features/itens/itens.api';
import { ItemDTO } from '@/features/itens/itens.types';

const itens: ItemDTO[] = [
  {
    id: 'item-1',
    titulo: 'Furadeira Bosch',
    descricao: 'Furadeira de impacto',
    categoria: 'Ferramentas',
    valorDiaria: 20,
    ativo: true,
    ownerId: 'user-1',
    condominioId: 'cond-1',
    imagens: [],
    createdAt: '2026-09-15T00:00:00.000Z',
  },
  {
    id: 'item-2',
    titulo: 'Jogo de taças',
    descricao: 'Taças de cristal pra 12 pessoas',
    categoria: 'Cozinha',
    valorDiaria: 10,
    ativo: true,
    ownerId: 'user-2',
    condominioId: 'cond-1',
    imagens: [],
    createdAt: '2026-09-15T00:00:00.000Z',
  },
];

describe('CatalogoPage', () => {
  it('lista os itens do condomínio', async () => {
    vi.spyOn(itensApi, 'listarItens').mockResolvedValue(itens);

    render(
      <MemoryRouter>
        <CatalogoPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Furadeira Bosch')).toBeInTheDocument();
    expect(screen.getByText('Jogo de taças')).toBeInTheDocument();
  });

  it('filtra por categoria ao clicar num chip', async () => {
    vi.spyOn(itensApi, 'listarItens').mockResolvedValue(itens);

    render(
      <MemoryRouter>
        <CatalogoPage />
      </MemoryRouter>,
    );

    await screen.findByText('Furadeira Bosch');
    await userEvent.click(screen.getByRole('button', { name: 'Cozinha' }));

    expect(screen.queryByText('Furadeira Bosch')).not.toBeInTheDocument();
    expect(screen.getByText('Jogo de taças')).toBeInTheDocument();
  });

  it('filtra pela busca de texto', async () => {
    vi.spyOn(itensApi, 'listarItens').mockResolvedValue(itens);

    render(
      <MemoryRouter>
        <CatalogoPage />
      </MemoryRouter>,
    );

    await screen.findByText('Furadeira Bosch');
    await userEvent.type(
      screen.getByPlaceholderText('Buscar item, serviço, categoria, marca…'),
      'taças',
    );

    await waitFor(() => expect(screen.queryByText('Furadeira Bosch')).not.toBeInTheDocument());
    expect(screen.getByText('Jogo de taças')).toBeInTheDocument();
  });

  it('a busca também encontra pela categoria e pela descrição', async () => {
    vi.spyOn(itensApi, 'listarItens').mockResolvedValue(itens);

    render(
      <MemoryRouter>
        <CatalogoPage />
      </MemoryRouter>,
    );

    await screen.findByText('Furadeira Bosch');
    const busca = screen.getByPlaceholderText('Buscar item, serviço, categoria, marca…');

    await userEvent.type(busca, 'cristal');
    await waitFor(() => expect(screen.queryByText('Furadeira Bosch')).not.toBeInTheDocument());
    expect(screen.getByText('Jogo de taças')).toBeInTheDocument();

    await userEvent.clear(busca);
    await userEvent.type(busca, 'ferramentas');
    await waitFor(() => expect(screen.queryByText('Jogo de taças')).not.toBeInTheDocument());
    expect(screen.getByText('Furadeira Bosch')).toBeInTheDocument();
  });

  it('mostra a contagem e permite limpar os filtros', async () => {
    vi.spyOn(itensApi, 'listarItens').mockResolvedValue(itens);

    render(
      <MemoryRouter>
        <CatalogoPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('2 anúncios')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cozinha' }));
    expect(screen.getByText('1 anúncio de 2')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(screen.getByText('2 anúncios')).toBeInTheDocument();
    expect(screen.getByText('Furadeira Bosch')).toBeInTheDocument();
  });

  it('a lista de itens fica numa região com rolagem própria', async () => {
    vi.spyOn(itensApi, 'listarItens').mockResolvedValue(itens);

    render(
      <MemoryRouter>
        <CatalogoPage />
      </MemoryRouter>,
    );

    const regiao = await screen.findByRole('region', { name: 'Anúncios do catálogo' });
    expect(regiao).toHaveClass('overflow-y-auto');
  });

  it('mostra estado vazio quando o condomínio ainda não tem itens', async () => {
    vi.spyOn(itensApi, 'listarItens').mockResolvedValue([]);

    render(
      <MemoryRouter>
        <CatalogoPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Ainda não há nada no catálogo')).toBeInTheDocument();
  });

  describe('itens e serviços', () => {
    const servico: ItemDTO = {
      id: 'serv-1',
      tipo: 'SERVICO',
      unidadeCobranca: 'HORA',
      titulo: 'Eletricista residencial',
      descricao: 'Tomadas, chuveiros e disjuntores',
      categoria: 'Elétrica',
      valorDiaria: 80,
      ativo: true,
      ownerId: 'user-3',
      condominioId: 'cond-1',
      imagens: [],
      createdAt: '2026-11-09T00:00:00.000Z',
      proprietario: { nome: 'Raquel Vieira', apartamento: '12' },
    };
    const mistos = [...itens, servico];

    function renderizar() {
      vi.spyOn(itensApi, 'listarItens').mockResolvedValue(mistos);
      render(
        <MemoryRouter>
          <CatalogoPage />
        </MemoryRouter>,
      );
    }

    it('mostra itens e serviços juntos, com a etiqueta e o valor por hora no serviço', async () => {
      renderizar();

      expect(await screen.findByText('Eletricista residencial')).toBeInTheDocument();
      expect(screen.getByText('Furadeira Bosch')).toBeInTheDocument();
      expect(screen.getByText('Serviço')).toBeInTheDocument();
      expect(screen.getByText('/ hora')).toBeInTheDocument();
      expect(screen.getByText('3 anúncios')).toBeInTheDocument();
    });

    it('o filtro "Serviços" mostra só os serviços e o "Itens para alugar" só os itens', async () => {
      renderizar();
      await screen.findByText('Eletricista residencial');

      await userEvent.click(screen.getByRole('button', { name: /^Serviços/ }));
      expect(screen.getByText('Eletricista residencial')).toBeInTheDocument();
      expect(screen.queryByText('Furadeira Bosch')).not.toBeInTheDocument();
      expect(screen.getByText('1 serviço')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /^Itens para alugar/ }));
      expect(screen.queryByText('Eletricista residencial')).not.toBeInTheDocument();
      expect(screen.getByText('Furadeira Bosch')).toBeInTheDocument();
      expect(screen.getByText('2 itens')).toBeInTheDocument();
    });

    it('as categorias acompanham o tipo escolhido, e a busca encontra quem presta', async () => {
      renderizar();
      await screen.findByText('Eletricista residencial');

      await userEvent.click(screen.getByRole('button', { name: /^Serviços/ }));
      expect(screen.queryByRole('button', { name: 'Ferramentas' })).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /^Tudo/ }));
      await userEvent.type(screen.getByPlaceholderText(/Buscar item, serviço/), 'raquel');
      expect(screen.getByText('Eletricista residencial')).toBeInTheDocument();
      expect(screen.queryByText('Furadeira Bosch')).not.toBeInTheDocument();
    });

    it('sem nenhum serviço, a aba Serviços convida quem presta a anunciar', async () => {
      vi.spyOn(itensApi, 'listarItens').mockResolvedValue(itens);
      render(
        <MemoryRouter>
          <CatalogoPage />
        </MemoryRouter>,
      );
      await screen.findByText('Furadeira Bosch');

      await userEvent.click(screen.getByRole('button', { name: /^Serviços/ }));

      expect(screen.getByText('Ainda não há serviços no catálogo')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Publicar serviço' })).toHaveAttribute(
        'href',
        '/itens/novo',
      );
    });
  });
});
