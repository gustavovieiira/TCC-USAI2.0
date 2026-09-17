import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
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
    <div className="notch flex gap-3 border border-paper-line bg-paper-surface p-4">
      <Avatar nome={post.autor.nome} />

      <div className="min-w-0 flex-1">
        <Link to={`/mural/${post.id}`} className="block">
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="font-semibold text-ink">{post.autor.nome}</span>
            <PapelTag papel={post.autor.papel} />
            <span className="font-meta text-xs text-ink-faint">
              · {formatRelativeTime(post.createdAt)}
            </span>
            {post.categoria && <span className="text-xs text-ink-faint">· {post.categoria}</span>}
          </div>
          <p className="mt-2 whitespace-pre-line font-display text-base font-semibold leading-snug text-ink">
            {post.conteudo}
          </p>
        </Link>

        <div className="mt-3 flex items-center gap-4 border-t border-dashed border-paper-line pt-2.5">
          {post.tipo === 'PEDIDO' && post.status && <PostStatusBadge status={post.status} />}

          <Link
            to={`/mural/${post.id}`}
            className="flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-barro-700"
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
              className="ml-auto text-ink-faint hover:text-carmim-500"
            >
              <IconExcluir className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
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
