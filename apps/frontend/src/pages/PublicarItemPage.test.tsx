import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PublicarItemPage } from './PublicarItemPage';
import * as itensApi from '@/features/itens/itens.api';

function ItemDetalheStub() {
  const { id } = useParams<{ id: string }>();
  return <p>Detalhe do item {id}</p>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/itens/novo']}>
      <Routes>
        <Route path="/itens/novo" element={<PublicarItemPage />} />
        <Route path="/itens/:id" element={<ItemDetalheStub />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PublicarItemPage — valor mínimo da diária (R$ 5,00)', () => {
  async function preencher(valor: string) {
    await userEvent.type(screen.getByLabelText('Título'), 'Furadeira Bosch');
    await userEvent.type(screen.getByLabelText('Categoria'), 'Ferramentas');
    await userEvent.type(
      screen.getByLabelText('Descrição'),
      'Furadeira de impacto em ótimo estado',
    );
    await userEvent.type(screen.getByLabelText('Valor por diária (R$)'), valor);
  }

  it('avisa o mínimo antes de preencher, e o campo não aceita menos de R$ 5,00', () => {
    renderPage();

    expect(screen.getByText(/Mínimo de R\$ 5,00 por diária/)).toBeInTheDocument();
    expect(screen.getByLabelText('Valor por diária (R$)')).toHaveAttribute('min', '5');
    expect(screen.getByLabelText('Valor por diária (R$)')).toHaveAccessibleDescription(
      /Mínimo de R\$ 5,00/,
    );
  });

  it.each(['4.99', '1', '0.5'])(
    'barra a publicação com diária de R$ %s, sem chamar a API',
    async (valor) => {
      const criar = vi.spyOn(itensApi, 'criarItem');

      renderPage();
      await preencher(valor);
      await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

      expect(await screen.findByText(/O valor mínimo da diária é R\$ 5,00/)).toBeInTheDocument();
      expect(criar).not.toHaveBeenCalled();
    },
  );

  it('o aviso some quando a pessoa corrige o valor, e R$ 5,00 exatos publica', async () => {
    const criar = vi.spyOn(itensApi, 'criarItem').mockResolvedValue({
      id: 'item-5',
      titulo: 'Furadeira Bosch',
      descricao: 'Furadeira de impacto em ótimo estado',
      categoria: 'Ferramentas',
      valorDiaria: 5,
      ativo: true,
      ownerId: 'user-1',
      condominioId: 'cond-1',
      imagens: [],
      createdAt: '2026-09-15T00:00:00.000Z',
    });

    renderPage();
    await preencher('3');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    expect(await screen.findByText(/O valor mínimo da diária é R\$ 5,00/)).toBeInTheDocument();

    const campo = screen.getByLabelText('Valor por diária (R$)');
    await userEvent.clear(campo);
    await userEvent.type(campo, '5');
    expect(screen.queryByText(/O valor mínimo da diária é R\$ 5,00/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(criar).toHaveBeenCalledWith(expect.objectContaining({ valorDiaria: 5 }));
    expect(await screen.findByText('Detalhe do item item-5')).toBeInTheDocument();
  });
});

describe('PublicarItemPage', () => {
  it('publica o item e navega pro detalhe recém-criado', async () => {
    vi.spyOn(itensApi, 'criarItem').mockResolvedValue({
      id: 'item-novo',
      titulo: 'Furadeira Bosch',
      descricao: 'Furadeira de impacto em ótimo estado',
      categoria: 'Ferramentas',
      valorDiaria: 20,
      ativo: true,
      ownerId: 'user-1',
      condominioId: 'cond-1',
      imagens: [],
      createdAt: '2026-09-15T00:00:00.000Z',
    });

    renderPage();

    await userEvent.type(screen.getByLabelText('Título'), 'Furadeira Bosch');
    await userEvent.type(screen.getByLabelText('Categoria'), 'Ferramentas');
    await userEvent.type(
      screen.getByLabelText('Descrição'),
      'Furadeira de impacto em ótimo estado',
    );
    await userEvent.type(screen.getByLabelText('Valor por diária (R$)'), '20');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(itensApi.criarItem).toHaveBeenCalledWith({
      titulo: 'Furadeira Bosch',
      categoria: 'Ferramentas',
      descricao: 'Furadeira de impacto em ótimo estado',
      valorDiaria: 20,
      imagens: undefined,
    });
    expect(await screen.findByText('Detalhe do item item-novo')).toBeInTheDocument();
  });

  it('faz upload da foto antes de criar o item, quando uma é escolhida', async () => {
    vi.spyOn(itensApi, 'uploadImagemItem').mockResolvedValue({
      url: 'http://localhost:3000/uploads/itens/foto-gerada.jpg',
    });
    vi.spyOn(itensApi, 'criarItem').mockResolvedValue({
      id: 'item-novo',
      titulo: 'Furadeira Bosch',
      descricao: 'Furadeira de impacto em ótimo estado',
      categoria: 'Ferramentas',
      valorDiaria: 20,
      ativo: true,
      ownerId: 'user-1',
      condominioId: 'cond-1',
      imagens: ['http://localhost:3000/uploads/itens/foto-gerada.jpg'],
      createdAt: '2026-09-15T00:00:00.000Z',
    });

    renderPage();

    const arquivo = new File(['conteudo'], 'furadeira.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByLabelText('Escolher foto'), arquivo);
    expect(await screen.findByLabelText('Trocar foto')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Título'), 'Furadeira Bosch');
    await userEvent.type(screen.getByLabelText('Categoria'), 'Ferramentas');
    await userEvent.type(
      screen.getByLabelText('Descrição'),
      'Furadeira de impacto em ótimo estado',
    );
    await userEvent.type(screen.getByLabelText('Valor por diária (R$)'), '20');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(itensApi.uploadImagemItem).toHaveBeenCalledWith(arquivo);
    expect(itensApi.criarItem).toHaveBeenCalledWith(
      expect.objectContaining({ imagens: ['http://localhost:3000/uploads/itens/foto-gerada.jpg'] }),
    );
    expect(await screen.findByText('Detalhe do item item-novo')).toBeInTheDocument();
  });

  it('rejeita um arquivo de formato não suportado sem chamar o upload', async () => {
    vi.spyOn(itensApi, 'uploadImagemItem');

    renderPage();

    // userEvent.upload respeita o atributo `accept` do input (como o seletor de arquivo do SO) e
    // não dispara o evento pra um tipo incompatível — por isso o change é forçado via fireEvent
    // aqui, exercitando a validação defensiva do componente (relevante pra drag-and-drop, por
    // exemplo, que não respeita `accept`).
    const arquivo = new File(['conteudo'], 'documento.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Escolher foto'), { target: { files: [arquivo] } });

    expect(await screen.findByRole('alert')).toHaveTextContent('Formato de imagem não suportado');
    expect(itensApi.uploadImagemItem).not.toHaveBeenCalled();
  });

  it('exibe erro quando o upload da imagem falha e não chega a criar o item', async () => {
    vi.spyOn(itensApi, 'uploadImagemItem').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'Falha no upload da imagem' } } },
    });
    vi.spyOn(itensApi, 'criarItem');

    renderPage();

    const arquivo = new File(['conteudo'], 'furadeira.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByLabelText('Escolher foto'), arquivo);

    await userEvent.type(screen.getByLabelText('Título'), 'Furadeira Bosch');
    await userEvent.type(screen.getByLabelText('Categoria'), 'Ferramentas');
    await userEvent.type(
      screen.getByLabelText('Descrição'),
      'Furadeira de impacto em ótimo estado',
    );
    await userEvent.type(screen.getByLabelText('Valor por diária (R$)'), '20');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha no upload da imagem');
    expect(itensApi.criarItem).not.toHaveBeenCalled();
  });

  it('exibe mensagem de erro quando a publicação falha', async () => {
    vi.spyOn(itensApi, 'criarItem').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'Dados inválidos' } } },
    });

    renderPage();

    await userEvent.type(screen.getByLabelText('Título'), 'Furadeira Bosch');
    await userEvent.type(screen.getByLabelText('Categoria'), 'Ferramentas');
    await userEvent.type(
      screen.getByLabelText('Descrição'),
      'Furadeira de impacto em ótimo estado',
    );
    await userEvent.type(screen.getByLabelText('Valor por diária (R$)'), '20');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Dados inválidos');
  });
});

describe('PublicarItemPage — identificação do bem', () => {
  const itemCriado = {
    id: 'item-novo',
    titulo: 'Furadeira Bosch',
    descricao: 'Furadeira de impacto em ótimo estado',
    categoria: 'Ferramentas',
    valorDiaria: 20,
    ativo: true,
    ownerId: 'user-1',
    condominioId: 'cond-1',
    imagens: [],
    createdAt: '2026-09-15T00:00:00.000Z',
  };

  async function preencherBasico() {
    await userEvent.type(screen.getByLabelText('Título'), 'Furadeira Bosch');
    await userEvent.type(screen.getByLabelText('Categoria'), 'Ferramentas');
    await userEvent.type(
      screen.getByLabelText('Descrição'),
      'Furadeira de impacto em ótimo estado',
    );
    await userEvent.type(screen.getByLabelText('Valor por diária (R$)'), '20');
  }

  it('fabricante, modelo, nº de série e acessórios são opcionais — sem eles o item publica como sempre', async () => {
    const criar = vi.spyOn(itensApi, 'criarItem').mockResolvedValue(itemCriado);
    renderPage();

    await preencherBasico();
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(criar.mock.calls[0][0]).toMatchObject({
      fabricante: undefined,
      modelo: undefined,
      numeroSerie: undefined,
      acessorios: undefined,
    });
  });

  it('envia a identificação e os acessórios informados (sem espaços sobrando)', async () => {
    const criar = vi.spyOn(itensApi, 'criarItem').mockResolvedValue(itemCriado);
    renderPage();

    await preencherBasico();
    await userEvent.type(screen.getByLabelText('Fabricante'), '  Bosch ');
    await userEvent.type(screen.getByLabelText('Modelo'), 'GSB 13 RE');
    await userEvent.type(screen.getByLabelText('Número de série'), 'SN-123');
    await userEvent.type(screen.getByLabelText('Novo acessório'), 'Maleta{Enter}');
    await userEvent.type(screen.getByLabelText('Novo acessório'), 'Jogo de brocas');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(criar).toHaveBeenCalledWith(
      expect.objectContaining({
        fabricante: 'Bosch',
        modelo: 'GSB 13 RE',
        numeroSerie: 'SN-123',
        acessorios: ['Maleta', 'Jogo de brocas'],
      }),
    );
  });

  it('acessório repetido é recusado e dá pra remover um da lista', async () => {
    const criar = vi.spyOn(itensApi, 'criarItem').mockResolvedValue(itemCriado);
    renderPage();

    await preencherBasico();
    await userEvent.type(screen.getByLabelText('Novo acessório'), 'Maleta{Enter}');
    await userEvent.type(screen.getByLabelText('Novo acessório'), 'maleta{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('já está na lista');

    // o texto repetido fica no campo pra ser corrigido; aqui trocamos por outro acessório
    await userEvent.clear(screen.getByLabelText('Novo acessório'));
    await userEvent.type(screen.getByLabelText('Novo acessório'), 'Brocas{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Remover Maleta' }));
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(criar.mock.calls[0][0].acessorios).toEqual(['Brocas']);
  });
});
