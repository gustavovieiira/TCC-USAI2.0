import { Link } from 'react-router-dom';
import { formatCurrency } from '@/lib/format';
import { ItemDTO } from './itens.types';

interface ItemCardProps {
  item: ItemDTO;
}

export function ItemCard({ item }: ItemCardProps) {
  const imagem = item.imagens[0];

  return (
    <Link
      to={`/itens/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-soft ring-1
        ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-soft-lg"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {imagem ? (
          <img
            src={imagem}
            alt={item.titulo}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <IconFoto className="h-10 w-10" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          {item.categoria}
        </span>
        <h3 className="line-clamp-1 font-semibold text-slate-900">{item.titulo}</h3>
        <p className="mt-auto pt-2 font-mono text-sm font-semibold text-slate-900">
          {formatCurrency(item.valorDiaria)}
          <span className="ml-1 font-sans text-xs font-normal text-slate-500">/ dia</span>
        </p>
      </div>
    </Link>
  );
}

function IconFoto({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M21 16l-5.5-5.5L5 21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
