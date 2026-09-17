import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { PapelTag } from '@/components/ui/Badge';
import { StoredUser } from '@/lib/authStorage';

interface ProfileMenuProps {
  user: StoredUser | null;
  onLogout: () => void;
}

/** Chip com avatar + nome no header, que abre um cartão com os dados da conta e o "Sair". */
export function ProfileMenu({ user, onLogout }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const nome = user?.nome ?? 'Conta';

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Menu da conta de ${nome}`}
        className="flex min-h-[44px] items-center gap-2 rounded px-1 py-1 transition
          hover:bg-ink-inverse/10"
      >
        <Avatar nome={nome} size="sm" />
        <span className="hidden flex-col items-start leading-tight sm:flex">
          <span className="text-sm font-semibold text-ink-inverse">{nome}</span>
          {user?.apartamento && (
            <span className="font-meta text-[10px] uppercase tracking-wide text-ink-inverse-soft">
              Apto {user.apartamento}
            </span>
          )}
        </span>
      </button>

      {open && (
        <div
          className="notch absolute right-0 top-full z-30 mt-2 w-64 border border-paper-line
            bg-paper-surface p-4 text-ink shadow-paper-2"
        >
          <div className="flex items-center gap-3">
            <Avatar nome={nome} />
            <div className="min-w-0">
              <p className="truncate font-display font-semibold leading-tight">{nome}</p>
              {user && <PapelTag papel={user.papel} />}
            </div>
          </div>

          {user && (
            <dl className="mt-4 space-y-2 border-t border-dashed border-paper-line pt-3 text-sm">
              <div>
                <dt className="font-meta text-[10px] uppercase tracking-wide text-ink-faint">
                  E-mail
                </dt>
                <dd className="truncate text-ink-soft">{user.email}</dd>
              </div>
              {user.apartamento && (
                <div>
                  <dt className="font-meta text-[10px] uppercase tracking-wide text-ink-faint">
                    Apartamento
                  </dt>
                  <dd className="text-ink-soft">{user.apartamento}</dd>
                </div>
              )}
            </dl>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="notch-sm mt-4 min-h-[44px] w-full border border-carmim-500 bg-paper-surface
              px-3 text-sm font-semibold text-carmim-700 transition hover:bg-carmim-100"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
