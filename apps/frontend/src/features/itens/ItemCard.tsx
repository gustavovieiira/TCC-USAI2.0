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
      className="notch group flex flex-col overflow-hidden border border-paper-line
        bg-paper-surface shadow-paper transition hover:-translate-y-0.5 hover:shadow-paper-2"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-[repeating-linear-gradient(135deg,#E4D3BC_0_6px,#DAC6AB_6px_12px)]">
        {imagem ? (
          <img
            src={imagem}
            alt={item.titulo}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <IconFoto className="h-10 w-10 text-ink/30" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="font-meta text-[10.5px] uppercase tracking-wider text-ink-faint">
          {item.categoria}
        </span>
        <h3 className="line-clamp-1 font-display font-semibold text-ink">{item.titulo}</h3>
        <p className="mt-auto pt-2 font-display text-lg font-bold text-barro-700">
          {formatCurrency(item.valorDiaria)}
          <span className="ml-1 font-sans text-xs font-normal text-ink-soft">/ dia</span>
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
