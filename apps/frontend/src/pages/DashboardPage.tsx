import { useNavigate } from 'react-router-dom';
import { clearSession, getStoredUser } from '@/lib/authStorage';

export function DashboardPage() {
  const navigate = useNavigate();
  const user = getStoredUser();

  function handleLogout() {
    clearSession();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <span className="text-xl font-bold text-brand-600">USAI</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">{user?.nome ?? 'Morador'}</span>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700
              hover:bg-slate-100"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900">
          Bem-vindo{user?.nome ? `, ${user.nome.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-2 text-slate-600">
          O catálogo de itens do seu condomínio está a caminho. Próximos módulos: publicar item,
          buscar itens e acompanhar locações.
        </p>
      </main>
    </div>
  );
}
