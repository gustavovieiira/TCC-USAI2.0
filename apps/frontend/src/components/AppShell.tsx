import { PropsWithChildren } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearSession, getStoredUser } from '@/lib/authStorage';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Início' },
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/anunciar', label: 'Anunciar' },
  { to: '/acompanhamento', label: 'Acompanhamento' },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
  }`;
}

export function AppShell({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const user = getStoredUser();

  function handleLogout() {
    clearSession();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-xl font-bold text-brand-600">USAI</span>
            <nav className="flex gap-1">
              {NAV_LINKS.map((link) => (
                <NavLink key={link.to} to={link.to} className={navLinkClass}>
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{user?.nome ?? 'Morador'}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium
                text-slate-700 hover:bg-slate-100"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
