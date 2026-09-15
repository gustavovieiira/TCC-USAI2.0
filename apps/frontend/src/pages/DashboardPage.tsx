import { Link } from 'react-router-dom';
import { getStoredUser, Papel } from '@/lib/authStorage';

interface Acao {
  to: string;
  titulo: string;
  texto: string;
}

const ACOES_MORADOR: Acao[] = [
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
  {
    to: '/saques',
    titulo: 'Saques',
    texto: 'Solicite o saque do que você recebeu em locações.',
  },
];

const ACOES_SINDICO: Acao[] = [
  {
    to: '/sindico',
    titulo: 'Painel do síndico',
    texto: 'Moradores, locações ativas e PIN do condomínio.',
  },
];

const ACOES_ADMIN: Acao[] = [
  {
    to: '/admin',
    titulo: 'Painel do Admin USAI',
    texto: 'Condomínios, síndicos e financeiro da plataforma.',
  },
];

function acoesPara(papel?: Papel): Acao[] {
  if (papel === 'SINDICO') return ACOES_SINDICO;
  if (papel === 'ADMIN') return ACOES_ADMIN;
  return ACOES_MORADOR;
}

export function DashboardPage() {
  const user = getStoredUser();
  const acoes = acoesPara(user?.papel);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Olá{user?.nome ? `, ${user.nome.split(' ')[0]}` : ''} 👋
        </h1>
        <p className="mt-1 text-slate-500">O que você quer fazer hoje?</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {acoes.map((acao) => (
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
