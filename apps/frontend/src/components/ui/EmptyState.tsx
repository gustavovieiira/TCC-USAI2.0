import { PropsWithChildren, ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: PropsWithChildren<EmptyStateProps>) {
  return (
    <div className="notch-lg flex flex-col items-center gap-3 border border-dashed border-paper-line bg-paper-surface px-6 py-12 text-center">
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-soft">{description}</p>}
      {action}
    </div>
  );
}
