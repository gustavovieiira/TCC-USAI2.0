import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MuralPage } from '@/pages/MuralPage';
import { PostDetalhePage } from '@/pages/PostDetalhePage';
import * as authStorage from '@/lib/authStorage';
import { GaleriaDeImagens } from './GaleriaDeImagens';
import * as muralApi from './mural.api';
import { PostCard } from './PostCard';
import { PostComComentariosDTO, PostDTO } from './mural.types';

const foto = (n: number) => `http://localhost:3000/uploads/mural/foto-${n}.jpg`;

function post(extra: Partial<PostDTO> = {}): PostDTO {
  return {
    id: 'post-1',
    conteudo: 'Vazamento no hall do bloco 2',
    tipo: 'AVISO',
    categoria: null,
    status: null,
    autor: { id: 'user-ana', nome: 'Ana', papel: 'MORADOR' },
    createdAt: '2026-11-09T12:00:00.000Z',
    comentariosCount: 0,
    ...extra,
  };
}

function imagemDe(tipo: string, nome: string, tamanho = 10) {
  return new File([new Uint8Array(tamanho)], nome, { type: tipo });
}

beforeEach(() => {
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:${Math.random()}`);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
});

afterEach(() => vi.restoreAllMocks());

describe('GaleriaDeImagens', () => {
  it('sem fotos não mostra nada', () => {
    const { container } = render(<GaleriaDeImagens imagens={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('uma foto aparece grande; várias, em grade', () => {
    const { unmount } = render(<GaleriaDeImagens imagens={[foto(1)]} />);
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getByRole('list', { name: 'Fotos do post' })).toHaveClass('grid-cols-1');
    unmount();

    render(<GaleriaDeImagens imagens={[foto(1), foto(2), foto(3)]} />);
    expect(screen.getAllByRole('img')).toHaveLength(3);
    expect(screen.getByRole('list', { name: 'Fotos do post' })).toHaveClass('grid-cols-2');
  });

  it('clicar amplia a foto, as setas passam de uma para outra e Esc fecha', async () => {
    render(
      <GaleriaDeImagens imagens={[foto(1), foto(2), foto(3)]} descricao="Foto do post de Ana" />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Ampliar Foto do post de Ana 2 de 3' }),
    );
    const janela = screen.getByRole('dialog', { name: 'Foto do post de Ana 2 de 3' });
    expect(within(janela).getByRole('img')).toHaveAttribute('src', foto(2));

    await userEvent.click(screen.getByRole('button', { name: 'Próxima foto' }));
    expect(within(screen.getByRole('dialog')).getByRole('img')).toHaveAttribute('src', foto(3));
    await userEvent.click(screen.getByRole('button', { name: 'Próxima foto' }));
    expect(within(screen.getByRole('dialog')).getByRole('img')).toHaveAttribute('src', foto(1));

    await userEvent.keyboard('{ArrowLeft}');
    expect(within(screen.getByRole('dialog')).getByRole('img')).toHaveAttribute('src', foto(3));
    await userEvent.keyboard('{ArrowRight}');
    expect(within(screen.getByRole('dialog')).getByRole('img')).toHaveAttribute('src', foto(1));
    await userEvent.click(screen.getByRole('button', { name: 'Foto anterior' }));
    expect(within(screen.getByRole('dialog')).getByRole('img')).toHaveAttribute('src', foto(3));

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('o botão Fechar e o clique no fundo também fecham, e com uma só foto não há setas', async () => {
    render(<GaleriaDeImagens imagens={[foto(1)]} />);

    await userEvent.click(screen.getByRole('button', { name: /Ampliar/ }));
    expect(screen.queryByRole('button', { name: 'Próxima foto' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Fechar foto' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Ampliar/ }));
    await userEvent.click(screen.getByRole('dialog'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('fotos nos posts', () => {
  it('o cartão do post mostra as fotos, e o post sem fotos continua igual', () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue(null);
    const { unmount } = render(
      <MemoryRouter>
        <PostCard post={post({ imagens: [foto(1), foto(2)] })} canDelete={false} />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('img')).toHaveLength(2);
    unmount();

    render(
      <MemoryRouter>
        <PostCard post={post()} canDelete={false} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('o detalhe do post também mostra as fotos', async () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue(null);
    const detalhe: PostComComentariosDTO = { ...post({ imagens: [foto(1)] }), comentarios: [] };
    vi.spyOn(muralApi, 'buscarPost').mockResolvedValue(detalhe);

    render(
      <MemoryRouter initialEntries={['/mural/post-1']}>
        <Routes>
          <Route path="/mural/:id" element={<PostDetalhePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('img', { name: /Foto do post de Ana 1 de 1/ })).toHaveAttribute(
      'src',
      foto(1),
    );
  });
});

describe('MuralPage: anexar fotos', () => {
  function montar() {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-ana',
      nome: 'Ana',
      email: 'ana@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
      apartamento: null,
    });
    vi.spyOn(muralApi, 'listarPosts').mockResolvedValue([]);
    render(
      <MemoryRouter>
        <MuralPage />
      </MemoryRouter>,
    );
  }

  const campo = () => document.getElementById('fotos-do-post') as HTMLInputElement;

  it('escolhe fotos, mostra as prévias e deixa remover uma', async () => {
    montar();
    await screen.findByText('O mural tá em branco hoje');

    await userEvent.upload(campo(), [
      imagemDe('image/jpeg', 'a.jpg'),
      imagemDe('image/png', 'b.png'),
    ]);

    expect(screen.getByRole('list', { name: 'Fotos escolhidas' })).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Fotos (2/4)' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remover foto 1' }));
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Fotos (1/4)' })).toBeInTheDocument();
  });

  it('publica enviando as fotos primeiro e anexando os endereços ao post', async () => {
    montar();
    const subir = vi
      .spyOn(muralApi, 'uploadImagemPost')
      .mockResolvedValueOnce({ url: foto(1) })
      .mockResolvedValueOnce({ url: foto(2) });
    const criar = vi
      .spyOn(muralApi, 'criarPost')
      .mockResolvedValue(
        post({ id: 'novo', conteudo: 'Olhem o vazamento', imagens: [foto(1), foto(2)] }),
      );
    await screen.findByText('O mural tá em branco hoje');

    await userEvent.type(
      screen.getByPlaceholderText('O que está acontecendo no condomínio?'),
      'Olhem o vazamento',
    );
    await userEvent.upload(campo(), [
      imagemDe('image/jpeg', 'a.jpg'),
      imagemDe('image/webp', 'b.webp'),
    ]);
    await userEvent.click(screen.getByRole('button', { name: 'Postar' }));

    expect(subir).toHaveBeenCalledTimes(2);
    expect(criar).toHaveBeenCalledWith(
      expect.objectContaining({ conteudo: 'Olhem o vazamento', imagens: [foto(1), foto(2)] }),
    );
    expect(await screen.findByText('Olhem o vazamento')).toBeInTheDocument();
    // depois de postar, o compositor volta ao começo
    expect(screen.queryByRole('list', { name: 'Fotos escolhidas' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Foto' })).toBeInTheDocument();
  });

  it('aceita no máximo 4 fotos', async () => {
    montar();
    await screen.findByText('O mural tá em branco hoje');

    await userEvent.upload(
      campo(),
      [1, 2, 3, 4, 5].map((n) => imagemDe('image/jpeg', `${n}.jpg`)),
    );

    expect(screen.getAllByRole('img')).toHaveLength(4);
    expect(screen.getByRole('alert')).toHaveTextContent('No máximo 4 fotos por post.');
    expect(screen.getByRole('button', { name: 'Fotos (4/4)' })).toBeDisabled();
  });

  it('recusa formato que não é imagem aceita e foto grande demais', async () => {
    montar();
    await screen.findByText('O mural tá em branco hoje');

    await userEvent.upload(campo(), imagemDe('application/pdf', 'x.pdf'), { applyAccept: false });
    expect(screen.getByRole('alert')).toHaveTextContent('Formato de imagem não suportado');
    expect(screen.queryByRole('list', { name: 'Fotos escolhidas' })).not.toBeInTheDocument();

    await userEvent.upload(campo(), imagemDe('image/jpeg', 'enorme.jpg', 5 * 1024 * 1024 + 1));
    expect(screen.getByRole('alert')).toHaveTextContent('no máximo 5 MB');
    expect(screen.queryByRole('list', { name: 'Fotos escolhidas' })).not.toBeInTheDocument();
  });

  it('se o envio de uma foto falha, mostra o erro e não publica', async () => {
    montar();
    vi.spyOn(muralApi, 'uploadImagemPost').mockRejectedValue(new Error('rede'));
    const criar = vi.spyOn(muralApi, 'criarPost');
    await screen.findByText('O mural tá em branco hoje');

    await userEvent.type(
      screen.getByPlaceholderText('O que está acontecendo no condomínio?'),
      'Com foto que falha',
    );
    await userEvent.upload(campo(), imagemDe('image/jpeg', 'a.jpg'));
    await userEvent.click(screen.getByRole('button', { name: 'Postar' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(criar).not.toHaveBeenCalled();
  });
});
