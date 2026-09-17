import { NavLink } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { StoredUser } from '@/lib/authStorage';

interface ProfileMenuProps {
  user: StoredUser | null;
}

/** Chip com avatar + nome no header, que leva pro perfil completo (`/perfil`). */
export function ProfileMenu({ user }: ProfileMenuProps) {
  const nome = user?.nome ?? 'Conta';

  return (
    <NavLink
      to="/perfil"
      className="flex min-h-[44px] items-center gap-2 rounded px-1 py-1 transition
        hover:bg-ink-inverse/10"
    >
      <Avatar nome={nome} size="sm" />
      <span className="hidden flex-col items-start leading-tight sm:flex">
        <span className="whitespace-nowrap text-sm font-semibold text-ink-inverse">{nome}</span>
        {user?.apartamento && (
          <span className="font-meta text-[10px] uppercase tracking-wide text-ink-inverse-soft">
            Apto {user.apartamento}
          </span>
        )}
      </span>
    </NavLink>
  );
}
