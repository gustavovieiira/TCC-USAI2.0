import { NavLink } from 'react-router-dom';
import { useNotificacoesContext } from '@/features/notificacoes/useNotificacoes';

/** Sino no header: leva à página de notificações e mostra quantas ainda não foram lidas. */
export function NotificacoesBell() {
  const { naoLidas } = useNotificacoesContext();
  const rotulo =
    naoLidas > 0
      ? `Notificações (${naoLidas} ${naoLidas === 1 ? 'não lida' : 'não lidas'})`
      : 'Notificações';

  return (
    <NavLink
      to="/notificacoes"
      aria-label={rotulo}
      className="relative flex h-11 w-11 items-center justify-center rounded transition
        hover:bg-ink-inverse/10"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-ink-inverse" aria-hidden="true">
        <path
          d="M6 17V11a6 6 0 1112 0v6l1.5 2h-15L6 17zM10 21a2 2 0 004 0"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {naoLidas > 0 && (
        <span
          className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center
            rounded-full bg-carmim-500 px-1 text-[10px] font-bold leading-none text-white"
          data-testid="notificacoes-contagem"
        >
          {naoLidas > 99 ? '99+' : naoLidas}
        </span>
      )}
    </NavLink>
  );
}
