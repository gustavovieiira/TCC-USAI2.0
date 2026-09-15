import { PropsWithChildren, ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: PropsWithChildren<EmptyStateProps>) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200
        bg-white px-6 py-12 text-center"
    >
      <p className="font-semibold text-slate-900">{title}</p>
      {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
      {action}
    </div>
  );
}
