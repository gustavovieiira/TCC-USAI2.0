import { StatusLocacao } from './locacoes.api';

const STATUS_LABEL: Record<StatusLocacao, string> = {
  PENDENTE: 'Pendente',
  APROVADA: 'Aprovada',
  PAGA: 'Paga',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

const STATUS_CLASS: Record<StatusLocacao, string> = {
  PENDENTE: 'bg-amber-50 text-amber-700 ring-amber-200',
  APROVADA: 'bg-blue-50 text-blue-700 ring-blue-200',
  PAGA: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  EM_ANDAMENTO: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  CONCLUIDA: 'bg-slate-100 text-slate-700 ring-slate-200',
  CANCELADA: 'bg-red-50 text-red-700 ring-red-200',
};

export function StatusBadge({ status }: { status: StatusLocacao }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
