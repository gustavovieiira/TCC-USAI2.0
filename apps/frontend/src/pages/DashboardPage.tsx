import { Link } from 'react-router-dom';
import { getStoredUser } from '@/lib/authStorage';

const ACOES = [
  {
    to: '/catalogo',
    titulo: 'Catálogo',
    texto: 'Veja os itens disponíveis no seu condomínio.',
  },
  {
    to: '/itens/novo',
    titulo: 'Publicar item',
    texto: 'Anuncie algo que está parado aí em casa.',
  },
  {
    to: '/locacoes',
    titulo: 'Minhas locações',
    texto: 'Acompanhe o que você alugou e o que emprestou.',
  },
];

export function DashboardPage() {
  const user = getStoredUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Olá{user?.nome ? `, ${user.nome.split(' ')[0]}` : ''} 👋
        </h1>
        <p className="mt-1 text-slate-500">O que você quer fazer hoje?</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {ACOES.map((acao) => (
          <Link
            key={acao.to}
            to={acao.to}
            className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-100 transition
              hover:-translate-y-0.5 hover:shadow-soft-lg"
          >
            <h2 className="font-semibold text-slate-900">{acao.titulo}</h2>
            <p className="mt-1 text-sm text-slate-500">{acao.texto}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
