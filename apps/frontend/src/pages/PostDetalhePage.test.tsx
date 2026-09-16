import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PostDetalhePage } from './PostDetalhePage';
import * as muralApi from '@/features/mural/mural.api';
import * as authStorage from '@/lib/authStorage';
import { PostComComentariosDTO } from '@/features/mural/mural.types';

function buildPost(overrides: Partial<PostComComentariosDTO> = {}): PostComComentariosDTO {
  return {
    id: 'post-1',
    conteudo: 'Preciso de uma escada só por um dia',
    tipo: 'PEDIDO',
    categoria: 'Ferramentas',
    status: 'ABERTO',
    autor: { id: 'user-autor', nome: 'Ana Proprietaria', papel: 'MORADOR' },
    createdAt: '2026-09-15T12:00:00.000Z',
    comentariosCount: 0,
    comentarios: [],
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/mural/post-1']}>
      <Routes>
        <Route path="/mural/:id" element={<PostDetalhePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PostDetalhePage', () => {
  it('exibe os dados do post e os comentários existentes', async () => {
    vi.spyOn(muralApi, 'buscarPost').mockResolvedValue(
      buildPost({
        comentarios: [
          {
            id: 'comentario-1',
            conteudo: 'Eu tenho uma, te empresto amanhã!',
            createdAt: '2026-09-15T13:00:00.000Z',
            autor: { id: 'user-2', nome: 'Bruno', papel: 'MORADOR' },
          },
        ],
      }),
    );
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue(null);

    renderPage();

    expect(await screen.findByText('Preciso de uma escada só por um dia')).toBeInTheDocument();
    expect(screen.getByText('Eu tenho uma, te empresto amanhã!')).toBeInTheDocument();
  });

  it('mostra estado vazio de comentários quando não há nenhum', async () => {
    vi.spyOn(muralApi, 'buscarPost').mockResolvedValue(buildPost());
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue(null);

    renderPage();

    await screen.findByText('Preciso de uma escada só por um dia');
    expect(screen.getByText('Nenhum comentário ainda. Seja o primeiro!')).toBeInTheDocument();
  });

  it('esconde "Marcar como atendido" e "Excluir" para quem não é autor nem síndico', async () => {
    vi.spyOn(muralApi, 'buscarPost').mockResolvedValue(buildPost());
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-outro',
      nome: 'Carlos',
      email: 'carlos@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
    });

    renderPage();

    await screen.findByText('Preciso de uma escada só por um dia');
    expect(screen.queryByRole('button', { name: 'Marcar como atendido' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
  });

  it('permite ao autor marcar o pedido como atendido', async () => {
    vi.spyOn(muralApi, 'buscarPost').mockResolvedValue(buildPost());
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-autor',
      nome: 'Ana Proprietaria',
      email: 'ana@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
    });
    vi.spyOn(muralApi, 'marcarAtendido').mockResolvedValue(
      buildPost({ status: 'ATENDIDO' }) as never,
    );

    renderPage();
    await screen.findByText('Preciso de uma escada só por um dia');

    await userEvent.click(screen.getByRole('button', { name: 'Marcar como atendido' }));

    expect(muralApi.marcarAtendido).toHaveBeenCalledWith('post-1');
    expect(await screen.findByText('Atendido')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar como atendido' })).not.toBeInTheDocument();
  });

  it('permite que o síndico exclua um post de outra pessoa', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(muralApi, 'buscarPost').mockResolvedValue(buildPost());
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-sindico',
      nome: 'Carla Síndica',
      email: 'carla@example.com',
      papel: 'SINDICO',
      condominioId: 'cond-1',
    });
    vi.spyOn(muralApi, 'excluirPost').mockResolvedValue(undefined);

    renderPage();
    await screen.findByText('Preciso de uma escada só por um dia');

    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(muralApi.excluirPost).toHaveBeenCalledWith('post-1');
  });

  it('envia um comentário e adiciona na lista sem precisar recarregar', async () => {
    vi.spyOn(muralApi, 'buscarPost').mockResolvedValue(buildPost());
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-outro',
      nome: 'Carlos',
      email: 'carlos@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
    });
    vi.spyOn(muralApi, 'responderPost').mockResolvedValue({
      id: 'comentario-nova',
      conteudo: 'Posso te ajudar com isso!',
      createdAt: '2026-09-16T10:00:00.000Z',
      autor: { id: 'user-outro', nome: 'Carlos', papel: 'MORADOR' },
    });

    renderPage();
    await screen.findByText('Preciso de uma escada só por um dia');

    await userEvent.type(screen.getByLabelText('Comentar'), 'Posso te ajudar com isso!');
    await userEvent.click(screen.getByRole('button', { name: 'Comentar' }));

    expect(muralApi.responderPost).toHaveBeenCalledWith('post-1', {
      conteudo: 'Posso te ajudar com isso!',
    });
    expect(await screen.findByText('Posso te ajudar com isso!')).toBeInTheDocument();
  });

  it('mostra "Conversar" com o autor do post e com quem comentou, exceto consigo mesmo', async () => {
    vi.spyOn(muralApi, 'buscarPost').mockResolvedValue(
      buildPost({
        comentarios: [
          {
            id: 'comentario-1',
            conteudo: 'Eu tenho uma, te empresto amanhã!',
            createdAt: '2026-09-15T13:00:00.000Z',
            autor: { id: 'user-outro', nome: 'Carlos', papel: 'MORADOR' },
          },
        ],
      }),
    );
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-outro',
      nome: 'Carlos',
      email: 'carlos@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
    });

    renderPage();
    await screen.findByText('Preciso de uma escada só por um dia');

    expect(
      screen.getByRole('button', { name: 'Conversar com Ana Proprietaria' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Conversar com Carlos' })).not.toBeInTheDocument();
  });

  it('não mostra "Conversar" com o próprio autor do post', async () => {
    vi.spyOn(muralApi, 'buscarPost').mockResolvedValue(buildPost());
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-autor',
      nome: 'Ana Proprietaria',
      email: 'ana@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
    });

    renderPage();
    await screen.findByText('Preciso de uma escada só por um dia');

    expect(
      screen.queryByRole('button', { name: 'Conversar com Ana Proprietaria' }),
    ).not.toBeInTheDocument();
  });

  it('exibe erro quando o carregamento do post falha', async () => {
    vi.spyOn(muralApi, 'buscarPost').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'Post não encontrado' } } },
    });
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue(null);

    renderPage();

    expect(await screen.findByText('Post não encontrado')).toBeInTheDocument();
  });
});
