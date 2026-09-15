import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearSession, getStoredUser, Papel } from '@/lib/authStorage';

interface NavItem {
  to: string;
  label: string;
  icon: (props: { className?: string }) => JSX.Element;
}

const MORADOR_NAV: NavItem[] = [
  { to: '/catalogo', label: 'Catálogo', icon: IconCatalogo },
  { to: '/itens/novo', label: 'Publicar', icon: IconPublicar },
  { to: '/locacoes', label: 'Locações', icon: IconLocacoes },
  { to: '/saques', label: 'Saques', icon: IconSaques },
];

const SINDICO_NAV: NavItem[] = [{ to: '/sindico', label: 'Síndico', icon: IconSindico }];

const ADMIN_NAV: NavItem[] = [{ to: '/admin', label: 'Admin', icon: IconAdmin }];

function navItemsPara(papel?: Papel): NavItem[] {
  if (papel === 'SINDICO') return SINDICO_NAV;
  if (papel === 'ADMIN') return ADMIN_NAV;
  return MORADOR_NAV;
}

export function AppShell() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const navItems = navItemsPara(user?.papel);

  function handleLogout() {
    clearSession();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
          <NavLink to="/dashboard" className="text-xl font-extrabold text-brand-600">
            USAI
          </NavLink>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {user?.nome ?? 'Morador'}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 md:px-6 md:pb-10 md:pt-8">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex items-stretch justify-around border-t
          border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition ${
                isActive ? 'text-brand-600' : 'text-slate-500'
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
