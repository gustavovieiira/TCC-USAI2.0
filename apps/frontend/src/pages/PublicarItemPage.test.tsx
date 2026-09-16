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
