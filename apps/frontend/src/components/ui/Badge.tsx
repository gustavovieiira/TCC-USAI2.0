import { StatusLocacao } from '@/features/locacoes/locacoes.types';
import { StatusSaque } from '@/features/saques/saques.types';

function Pill({ className, children }: { className: string; children: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1
        ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

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

export function StatusBadge({ status }: { status: StatusLocacao }) {
  return <Pill className={STATUS_CLASSES[status]}>{STATUS_LABEL[status]}</Pill>;
}

const SAQUE_STATUS_LABEL: Record<StatusSaque, string> = {
  PENDENTE: 'Pendente',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
};

const SAQUE_STATUS_CLASSES: Record<StatusSaque, string> = {
  PENDENTE: 'bg-amber-50 text-amber-700 ring-amber-200',
  APROVADO: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  REJEITADO: 'bg-red-50 text-red-700 ring-red-200',
};

export function SaqueStatusBadge({ status }: { status: StatusSaque }) {
  return <Pill className={SAQUE_STATUS_CLASSES[status]}>{SAQUE_STATUS_LABEL[status]}</Pill>;
}
