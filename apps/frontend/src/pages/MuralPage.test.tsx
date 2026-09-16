import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MuralPage } from './MuralPage';
import * as muralApi from '@/features/mural/mural.api';
import * as authStorage from '@/lib/authStorage';
import { PostDTO } from '@/features/mural/mural.types';

function buildPost(overrides: Partial<PostDTO> = {}): PostDTO {
  return {
    id: 'post-1',
    conteudo: 'Manutenção do elevador social amanhã, das 8h às 12h.',
    tipo: 'AVISO',
    categoria: null,
    status: null,
    autor: { id: 'user-sindico', nome: 'Carla Síndica', papel: 'SINDICO' },
    createdAt: '2026-09-16T12:00:00.000Z',
    comentariosCount: 0,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MuralPage />
    </MemoryRouter>,
  );
}

describe('MuralPage', () => {
  it('lista os posts existentes, com o selo de papel do autor', async () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue(null);
    vi.spyOn(muralApi, 'listarPosts').mockResolvedValue([buildPost()]);

    renderPage();

    expect(
      await screen.findByText('Manutenção do elevador social amanhã, das 8h às 12h.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Síndico')).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há posts', async () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue(null);
    vi.spyOn(muralApi, 'listarPosts').mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Nenhum post ainda')).toBeInTheDocument();
  });

  it('publica um post do tipo Post (aviso) por padrão e adiciona na lista sem precisar recarregar', async () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-1',
      nome: 'Ana Proprietaria',
      email: 'ana@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
    });
    vi.spyOn(muralApi, 'listarPosts').mockResolvedValue([]);
    vi.spyOn(muralApi, 'criarPost').mockResolvedValue(
      buildPost({ id: 'post-novo', conteudo: 'Alguém viu meu gato?', tipo: 'AVISO' }),
    );

    renderPage();
    await screen.findByText('Nenhum post ainda');

    await userEvent.type(
      screen.getByPlaceholderText('O que está acontecendo no condomínio?'),
      'Alguém viu meu gato?',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Postar' }));

    expect(muralApi.criarPost).toHaveBeenCalledWith({
      conteudo: 'Alguém viu meu gato?',
      tipo: 'AVISO',
      categoria: undefined,
    });
    expect(await screen.findByText('Alguém viu meu gato?')).toBeInTheDocument();
  });

  it('publica um pedido de ajuda com categoria quando o tipo é alternado', async () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-1',
      nome: 'Ana Proprietaria',
      email: 'ana@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
    });
    vi.spyOn(muralApi, 'listarPosts').mockResolvedValue([]);
    vi.spyOn(muralApi, 'criarPost').mockResolvedValue(
      buildPost({
        id: 'post-novo',
        conteudo: 'Preciso de uma escada',
        tipo: 'PEDIDO',
        status: 'ABERTO',
        categoria: 'Ferramentas',
      }),
    );

    renderPage();
    await screen.findByText('Nenhum post ainda');

    await userEvent.click(screen.getByRole('button', { name: 'Preciso de ajuda' }));
    await userEvent.type(
      screen.getByPlaceholderText('O que está acontecendo no condomínio?'),
      'Preciso de uma escada',
    );
    await userEvent.type(screen.getByPlaceholderText('Categoria (opcional)'), 'Ferramentas');
    await userEvent.click(screen.getByRole('button', { name: 'Postar' }));

    expect(muralApi.criarPost).toHaveBeenCalledWith({
      conteudo: 'Preciso de uma escada',
      tipo: 'PEDIDO',
      categoria: 'Ferramentas',
    });
    expect(await screen.findByText('Aberto')).toBeInTheDocument();
  });

  it('exibe erro quando a publicação falha', async () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-1',
      nome: 'Ana Proprietaria',
      email: 'ana@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
    });
    vi.spyOn(muralApi, 'listarPosts').mockResolvedValue([]);
    vi.spyOn(muralApi, 'criarPost').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'Dados inválidos' } } },
    });

    renderPage();
    await screen.findByText('Nenhum post ainda');

    await userEvent.type(
      screen.getByPlaceholderText('O que está acontecendo no condomínio?'),
      'Alguma coisa',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Postar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Dados inválidos');
  });

  it('permite que o autor exclua o próprio post', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-sindico',
      nome: 'Carla Síndica',
      email: 'carla@example.com',
      papel: 'SINDICO',
      condominioId: 'cond-1',
    });
    vi.spyOn(muralApi, 'listarPosts').mockResolvedValue([buildPost()]);
    vi.spyOn(muralApi, 'excluirPost').mockResolvedValue(undefined);

    renderPage();
    await screen.findByText('Manutenção do elevador social amanhã, das 8h às 12h.');

    await userEvent.click(screen.getByRole('button', { name: 'Excluir post' }));

    expect(muralApi.excluirPost).toHaveBeenCalledWith('post-1');
    expect(
      screen.queryByText('Manutenção do elevador social amanhã, das 8h às 12h.'),
    ).not.toBeInTheDocument();
  });

  it('não mostra o botão de excluir pra quem não é autor nem síndico', async () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-outro',
      nome: 'Bruno',
      email: 'bruno@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
    });
    vi.spyOn(muralApi, 'listarPosts').mockResolvedValue([buildPost()]);

    renderPage();
    await screen.findByText('Manutenção do elevador social amanhã, das 8h às 12h.');

    expect(screen.queryByRole('button', { name: 'Excluir post' })).not.toBeInTheDocument();
  });

  it('mostra "Conversar" pra quem não é o autor do post', async () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-outro',
      nome: 'Bruno',
      email: 'bruno@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
    });
    vi.spyOn(muralApi, 'listarPosts').mockResolvedValue([buildPost()]);

    renderPage();
    await screen.findByText('Manutenção do elevador social amanhã, das 8h às 12h.');

    expect(screen.getByRole('button', { name: 'Conversar com Carla Síndica' })).toBeInTheDocument();
  });

  it('não mostra "Conversar" no próprio post', async () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-sindico',
      nome: 'Carla Síndica',
      email: 'carla@example.com',
      papel: 'SINDICO',
      condominioId: 'cond-1',
    });
    vi.spyOn(muralApi, 'listarPosts').mockResolvedValue([buildPost()]);

    renderPage();
    await screen.findByText('Manutenção do elevador social amanhã, das 8h às 12h.');

    expect(
      screen.queryByRole('button', { name: 'Conversar com Carla Síndica' }),
    ).not.toBeInTheDocument();
  });
});
