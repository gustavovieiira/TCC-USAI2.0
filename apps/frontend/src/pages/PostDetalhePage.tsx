import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { PapelTag, PostStatusBadge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Avatar } from '@/components/ui/Avatar';
import { ConversarButton } from '@/features/conversas/ConversarButton';
import { extractErrorMessage } from '@/lib/apiClient';
import { getStoredUser } from '@/lib/authStorage';
import { formatRelativeTime } from '@/lib/format';
import { buscarPost, excluirPost, marcarAtendido, responderPost } from '@/features/mural/mural.api';
import { PostComComentariosDTO } from '@/features/mural/mural.types';

export function PostDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = getStoredUser();

  const [post, setPost] = useState<PostComComentariosDTO | null>(null);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erroResposta, setErroResposta] = useState<string | null>(null);

  const [atendendo, setAtendendo] = useState(false);
  const [erroAtender, setErroAtender] = useState<string | null>(null);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    buscarPost(id)
      .then(setPost)
      .catch((err) => setErroCarregamento(extractErrorMessage(err)));
  }, [id]);

  async function handleResponder(event: FormEvent) {
    event.preventDefault();
    const conteudo = texto.trim();
    if (!id || !conteudo) return;

    setEnviando(true);
    setErroResposta(null);

    try {
      const comentario = await responderPost(id, { conteudo });
      setPost((atual) =>
        atual ? { ...atual, comentarios: [...atual.comentarios, comentario] } : atual,
      );
      setTexto('');
    } catch (err) {
      setErroResposta(extractErrorMessage(err));
    } finally {
      setEnviando(false);
    }
  }

  async function handleMarcarAtendido() {
    if (!id) return;
    setAtendendo(true);
    setErroAtender(null);

    try {
      const atualizado = await marcarAtendido(id);
      setPost((atual) => (atual ? { ...atual, status: atualizado.status } : atual));
    } catch (err) {
      setErroAtender(extractErrorMessage(err));
    } finally {
      setAtendendo(false);
    }
  }

  async function handleExcluir() {
    if (!id) return;
    if (!window.confirm('Excluir este post do mural?')) return;

    setErroExcluir(null);
    try {
      await excluirPost(id);
      navigate('/mural');
    } catch (err) {
      setErroExcluir(extractErrorMessage(err));
    }
  }

  if (erroCarregamento) {
    return <p className="text-sm text-carmim-700">{erroCarregamento}</p>;
  }

  if (!post) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const ehAutor = user?.id === post.autor.id;
  const podeExcluir = ehAutor || user?.papel === 'SINDICO';

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <button
        onClick={() => navigate(-1)}
        className="self-start text-sm font-semibold text-ink-soft hover:text-ink"
      >
        ← Voltar
      </button>

      <div className="notch border border-paper-line bg-paper-surface p-5 shadow-paper">
        <div className="flex gap-3">
          <Avatar nome={post.autor.nome} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="font-semibold text-ink">{post.autor.nome}</span>
              <PapelTag papel={post.autor.papel} />
              <span className="font-meta text-xs text-ink-faint">
                · {formatRelativeTime(post.createdAt)}
              </span>
              {post.categoria && <span className="text-xs text-ink-faint">· {post.categoria}</span>}
            </div>
            <p className="mt-2 whitespace-pre-line font-display text-lg font-semibold leading-snug text-ink">
              {post.conteudo}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {post.tipo === 'PEDIDO' && post.status && <PostStatusBadge status={post.status} />}

              {ehAutor && post.tipo === 'PEDIDO' && post.status === 'ABERTO' && (
                <Button
                  variant="secondary"
                  fullWidth={false}
                  isLoading={atendendo}
                  onClick={handleMarcarAtendido}
                >
                  Marcar como atendido
                </Button>
              )}

              {!ehAutor && (
                <ConversarButton
                  usuarioId={post.autor.id}
                  nomeDoOutro={post.autor.nome}
                  postOrigemId={post.id}
                  variant="text"
                />
              )}

              {podeExcluir && (
                <button
                  type="button"
                  onClick={handleExcluir}
                  className="text-sm font-semibold text-carmim-500 hover:text-carmim-700"
                >
                  Excluir
                </button>
              )}
            </div>

            {erroAtender && <p className="mt-2 text-sm text-carmim-700">{erroAtender}</p>}
            {erroExcluir && <p className="mt-2 text-sm text-carmim-700">{erroExcluir}</p>}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">
          Comentários{post.comentarios.length > 0 && ` (${post.comentarios.length})`}
        </h2>

        {post.comentarios.length === 0 && (
          <p className="text-sm text-ink-faint">Nenhum comentário ainda. Seja o primeiro!</p>
        )}

        <div className="flex flex-col gap-3">
          {post.comentarios.map((comentario) => (
            <div key={comentario.id} className="flex gap-3">
              <Avatar nome={comentario.autor.nome} />
              <div className="notch min-w-0 flex-1 bg-paper px-3 py-2">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-semibold text-ink">{comentario.autor.nome}</span>
                  <PapelTag papel={comentario.autor.papel} />
                  <span className="font-meta text-ink-faint">
                    · {formatRelativeTime(comentario.createdAt)}
                  </span>
                  {user?.id !== comentario.autor.id && (
                    <ConversarButton
                      usuarioId={comentario.autor.id}
                      nomeDoOutro={comentario.autor.nome}
                      postOrigemId={post.id}
                    />
                  )}
                </div>
                <p className="mt-0.5 whitespace-pre-line text-sm text-ink">{comentario.conteudo}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="notch border border-paper-line bg-paper-surface p-4 shadow-paper">
        <form onSubmit={handleResponder} className="flex flex-col gap-3">
          <label htmlFor="resposta" className="text-sm font-medium text-ink">
            Comentar
          </label>
          <textarea
            id="resposta"
            rows={3}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escreva um comentário..."
            className="border border-ink/40 bg-paper-surface px-3 py-2 text-sm text-ink
              outline-none transition focus:border-ink"
          />
          {erroResposta && (
            <p role="alert" className="text-sm text-carmim-700">
              {erroResposta}
            </p>
          )}
          <Button type="submit" isLoading={enviando} disabled={!texto.trim()} fullWidth={false}>
            Comentar
          </Button>
        </form>
      </div>
    </div>
  );
}
