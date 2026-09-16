import { FormEvent, useEffect, useState } from 'react';
import { Avatar, PostCard } from '@/features/mural/PostCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { extractErrorMessage } from '@/lib/apiClient';
import { getStoredUser } from '@/lib/authStorage';
import { criarPost, excluirPost, listarPosts } from '@/features/mural/mural.api';
import { PostDTO, TipoPost } from '@/features/mural/mural.types';

export function MuralPage() {
  const user = getStoredUser();

  const [posts, setPosts] = useState<PostDTO[] | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const [conteudo, setConteudo] = useState('');
  const [tipo, setTipo] = useState<TipoPost>('AVISO');
  const [categoria, setCategoria] = useState('');
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    listarPosts()
      .then(setPosts)
      .catch((err) => setErroLista(extractErrorMessage(err)));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErroForm(null);
    setIsLoading(true);

    try {
      const novo = await criarPost({
        conteudo,
        tipo,
        categoria: tipo === 'PEDIDO' ? categoria || undefined : undefined,
      });
      setPosts((atual) => (atual ? [novo, ...atual] : [novo]));
      setConteudo('');
      setCategoria('');
      setTipo('AVISO');
    } catch (err) {
      setErroForm(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir este post do mural?')) return;

    try {
      await excluirPost(id);
      setPosts((atual) => atual?.filter((post) => post.id !== id) ?? atual);
    } catch (err) {
      setErroLista(extractErrorMessage(err));
    }
  }

  function podeExcluir(post: PostDTO): boolean {
    if (!user) return false;
    return user.id === post.autor.id || user.papel === 'SINDICO';
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-900">Mural</h1>
        <p className="text-sm text-slate-500">
          O que está rolando no condomínio? Poste um aviso ou peça ajuda pra vizinhança.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-100">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Avatar nome={user?.nome ?? '?'} />

          <div className="flex flex-1 flex-col gap-3">
            <textarea
              rows={2}
              required
              minLength={3}
              maxLength={2000}
              placeholder="O que está acontecendo no condomínio?"
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              className="w-full resize-none border-0 text-sm text-slate-800 outline-none
                placeholder:text-slate-400"
            />

            <div className="flex flex-wrap items-center gap-2">
              <SegmentButton active={tipo === 'AVISO'} onClick={() => setTipo('AVISO')}>
                Post
              </SegmentButton>
              <SegmentButton active={tipo === 'PEDIDO'} onClick={() => setTipo('PEDIDO')}>
                Preciso de ajuda
              </SegmentButton>

              {tipo === 'PEDIDO' && (
                <input
                  type="text"
                  placeholder="Categoria (opcional)"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="min-w-0 flex-1 rounded-full border border-slate-200 px-3 py-1 text-xs
                    outline-none focus:border-brand-500"
                />
              )}
            </div>

            {erroForm && (
              <p role="alert" className="text-sm text-red-600">
                {erroForm}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || conteudo.trim().length < 3}
                className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white
                  transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Postando...' : 'Postar'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="mt-2">
        {erroLista && <p className="text-sm text-red-600">{erroLista}</p>}

        {!posts && !erroLista && (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        )}

        {posts && posts.length === 0 && (
          <EmptyState
            title="Nenhum post ainda"
            description="Seja o primeiro a compartilhar algo com o condomínio."
          />
        )}

        {posts && posts.length > 0 && (
          <div>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                canDelete={podeExcluir(post)}
                onDelete={() => handleDelete(post.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
        active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  );
}
