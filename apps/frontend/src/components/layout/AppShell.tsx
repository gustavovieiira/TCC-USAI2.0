import { NavLink, Outlet } from 'react-router-dom';
import { getStoredUser, homeRouteFor, Papel } from '@/lib/authStorage';
import { ProfileMenu } from './ProfileMenu';

interface NavItem {
  to: string;
  label: string;
  icon: (props: { className?: string }) => JSX.Element;
}

const MORADOR_NAV: NavItem[] = [
  { to: '/catalogo', label: 'Catálogo', icon: IconCatalogo },
  { to: '/itens/novo', label: 'Publicar', icon: IconPublicar },
  { to: '/locacoes', label: 'Locações', icon: IconLocacoes },
  { to: '/mural', label: 'Mural', icon: IconMural },
  { to: '/conversas', label: 'Conversas', icon: IconConversas },
  { to: '/saques', label: 'Saques', icon: IconSaques },
];

const SINDICO_NAV: NavItem[] = [
  { to: '/sindico', label: 'Síndico', icon: IconSindico },
  { to: '/mural', label: 'Mural', icon: IconMural },
  { to: '/conversas', label: 'Conversas', icon: IconConversas },
];

const ADMIN_NAV: NavItem[] = [{ to: '/admin', label: 'Admin', icon: IconAdmin }];

function navItemsPara(papel?: Papel): NavItem[] {
  if (papel === 'SINDICO') return SINDICO_NAV;
  if (papel === 'ADMIN') return ADMIN_NAV;
  return MORADOR_NAV;
}

export function AppShell() {
  const user = getStoredUser();
  const navItems = navItemsPara(user?.papel);

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-20 bg-ink text-ink-inverse">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <NavLink
            to={homeRouteFor(user?.papel)}
            className="flex items-center gap-2 font-display text-xl font-bold text-ink-inverse"
          >
            <span className="notch-sm h-5 w-5 bg-barro-400" aria-hidden="true" />
            USAI
          </NavLink>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-2 text-sm font-semibold transition ${
                    isActive ? 'text-barro-400' : 'text-ink-inverse-soft hover:text-ink-inverse'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <ProfileMenu user={user} />
        </div>
      </header>

      <main className="mx-auto max-w-5xl bg-cortica bg-cortica-grid px-4 pb-24 pt-6 md:px-6 md:pb-10 md:pt-8">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex items-stretch justify-around border-t
          border-paper-line bg-paper-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition ${
                isActive ? 'text-barro-700' : 'text-ink-faint'
              }`
            }
          >
            <Icon className="h-6 w-6" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function IconCatalogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 7h16M4 12h16M4 17h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPublicar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconLocacoes({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8 3v4M16 3v4M4 10h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSaques({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3v12m0 0l-4-4m4 4l4-4M5 17v2a2 2 0 002 2h10a2 2 0 002-2v-2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMural({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 5h16v10H9l-4 4v-4H4V5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8 9h8M8 12h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconConversas({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M21 11.5a7.5 7.5 0 01-11.4 6.4L4 19l1.1-4A7.5 7.5 0 1121 11.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSindico({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconAdmin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
