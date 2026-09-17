import { StatusLocacao } from '@/features/locacoes/locacoes.types';
import { StatusPost } from '@/features/mural/mural.types';
import { StatusSaque } from '@/features/saques/saques.types';
import { Papel } from '@/lib/authStorage';

function Pill({ className, children }: { className: string; children: string }) {
  return (
    <span
      className={`notch-sm inline-flex items-center px-2.5 py-1 text-xs font-bold ${className}`}
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
  PENDENTE: 'bg-mostarda-100 text-mostarda-700',
  APROVADA: 'bg-jade-100 text-jade-700',
  PAGA: 'bg-jade-100 text-jade-700',
  EM_ANDAMENTO: 'bg-roxo-100 text-roxo-500',
  CONCLUIDA: 'bg-paper-line text-ink-soft',
  CANCELADA: 'bg-carmim-100 text-carmim-700',
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
  PENDENTE: 'bg-mostarda-100 text-mostarda-700',
  APROVADO: 'bg-jade-100 text-jade-700',
  REJEITADO: 'bg-carmim-100 text-carmim-700',
};

export function SaqueStatusBadge({ status }: { status: StatusSaque }) {
  return <Pill className={SAQUE_STATUS_CLASSES[status]}>{SAQUE_STATUS_LABEL[status]}</Pill>;
}

const POST_STATUS_LABEL: Record<StatusPost, string> = {
  ABERTO: 'Aberto',
  ATENDIDO: 'Atendido',
};

const POST_STATUS_CLASSES: Record<StatusPost, string> = {
  ABERTO: 'bg-barro-100 text-barro-700',
  ATENDIDO: 'bg-jade-100 text-jade-700',
};

export function PostStatusBadge({ status }: { status: StatusPost }) {
  return <Pill className={POST_STATUS_CLASSES[status]}>{POST_STATUS_LABEL[status]}</Pill>;
}

const PAPEL_LABEL: Partial<Record<Papel, string>> = {
  SINDICO: 'Síndico',
  ADMIN: 'Admin USAI',
};

const PAPEL_CLASSES: Partial<Record<Papel, string>> = {
  SINDICO: 'bg-jade-500 text-jade-100',
  ADMIN: 'bg-ink text-ink-inverse',
};

/** Selo pequeno ao lado do nome do autor no feed — só aparece pra papéis "oficiais". */
export function PapelTag({ papel }: { papel: Papel }) {
  const label = PAPEL_LABEL[papel];
  if (!label) return null;

  return (
    <span
      className={`notch-sm inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold
        ${PAPEL_CLASSES[papel]}`}
    >
      {label}
    </span>
  );
}
