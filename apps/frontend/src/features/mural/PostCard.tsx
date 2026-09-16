import { Link } from 'react-router-dom';
import { PapelTag, PostStatusBadge } from '@/components/ui/Badge';
import { ConversarButton } from '@/features/conversas/ConversarButton';
import { getStoredUser } from '@/lib/authStorage';
import { formatRelativeTime } from '@/lib/format';
import { PostDTO } from './mural.types';

interface PostCardProps {
  post: PostDTO;
  canDelete: boolean;
  onDelete?: () => void;
}

export function PostCard({ post, canDelete, onDelete }: PostCardProps) {
  const user = getStoredUser();
  const ehAutor = user?.id === post.autor.id;

  return (
    <div className="flex gap-3 border-b border-slate-100 py-4 last:border-0">
      <Avatar nome={post.autor.nome} />

      <div className="min-w-0 flex-1">
        <Link to={`/mural/${post.id}`} className="block">
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="font-semibold text-slate-900">{post.autor.nome}</span>
            <PapelTag papel={post.autor.papel} />
            <span className="text-slate-400">· {formatRelativeTime(post.createdAt)}</span>
            {post.categoria && <span className="text-slate-400">· {post.categoria}</span>}
          </div>
          <p className="mt-0.5 whitespace-pre-line text-sm text-slate-700">{post.conteudo}</p>
        </Link>

        <div className="mt-2 flex items-center gap-4">
          {post.tipo === 'PEDIDO' && post.status && <PostStatusBadge status={post.status} />}

          <Link
            to={`/mural/${post.id}`}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-600"
          >
            <IconComentario className="h-4 w-4" />
            {post.comentariosCount > 0 && post.comentariosCount}
          </Link>

          {!ehAutor && (
            <ConversarButton
              usuarioId={post.autor.id}
              nomeDoOutro={post.autor.nome}
              postOrigemId={post.id}
            />
          )}

          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label="Excluir post"
              className="ml-auto text-slate-400 hover:text-red-600"
            >
              <IconExcluir className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Avatar({ nome }: { nome: string }) {
  const inicial = nome.trim().charAt(0).toUpperCase() || '?';
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100
        font-semibold text-brand-700"
    >
      {inicial}
    </div>
  );
}

function IconComentario({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 5h16v10H9l-4 4v-4H4V5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconExcluir({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M5 7h14M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0v13a1 1 0 001 1h8a1 1 0 001-1V7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
