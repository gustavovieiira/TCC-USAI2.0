import { Link } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { getStoredUser } from '@/lib/authStorage';

export function DashboardPage() {
  const user = getStoredUser();

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold text-slate-900">
        Bem-vindo{user?.nome ? `, ${user.nome.split(' ')[0]}` : ''}
      </h1>
      <p className="mt-2 text-slate-600">
        Explore os itens disponíveis no seu condomínio ou anuncie algo que você não usa com
        frequência.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          to="/catalogo"
          className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-100 hover:ring-brand-200"
        >
          <h2 className="font-semibold text-slate-900">Explorar itens</h2>
          <p className="mt-1 text-sm text-slate-600">Veja o que seus vizinhos têm disponível.</p>
        </Link>
        <Link
          to="/anunciar"
          className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-100 hover:ring-brand-200"
        >
          <h2 className="font-semibold text-slate-900">Anunciar item</h2>
          <p className="mt-1 text-sm text-slate-600">Publique algo seu para locação.</p>
        </Link>
        <Link
          to="/acompanhamento"
          className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-100 hover:ring-brand-200"
        >
          <h2 className="font-semibold text-slate-900">Minhas locações</h2>
          <p className="mt-1 text-sm text-slate-600">Acompanhe pedidos feitos e recebidos.</p>
        </Link>
      </div>
    </AppShell>
  );
}
