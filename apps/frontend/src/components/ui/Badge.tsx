import { StatusLocacao } from '@/features/locacoes/locacoes.types';

const STATUS_LABEL: Record<StatusLocacao, string> = {
  PENDENTE: 'Pendente',
  APROVADA: 'Aprovada',
  PAGA: 'Paga',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

const STATUS_CLASSES: Record<StatusLocacao, string> = {
  PENDENTE: 'bg-amber-50 text-amber-700 ring-amber-200',
  APROVADA: 'bg-brand-50 text-brand-700 ring-brand-200',
  PAGA: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  EM_ANDAMENTO: 'bg-violet-50 text-violet-700 ring-violet-200',
  CONCLUIDA: 'bg-slate-100 text-slate-600 ring-slate-200',
  CANCELADA: 'bg-red-50 text-red-700 ring-red-200',
};

interface StatusBadgeProps {
  status: StatusLocacao;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1
        ring-inset ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
