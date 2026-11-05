import { PropsWithChildren, ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/** A janela do vazio: apagada, com a luz piscando de leve, como quem está para chegar. */
function JanelaVazia() {
  return (
    <svg viewBox="0 0 96 112" className="h-24 w-auto" aria-hidden="true" focusable="false">
      <path d="M6 112V44C6 20 26 6 48 6s42 14 42 38v68z" fill="#0D3B44" />
      <path d="M14 112V45c0-19 15-31 34-31s34 12 34 31v67z" fill="#092A31" />
      <path
        className="luz-vizinho"
        style={{ '--base': 0.1, '--alto': 0.95, '--duracao': '3.4s' } as React.CSSProperties}
        d="M14 112V45c0-19 15-31 34-31s34 12 34 31v67z"
        fill="#FFC24B"
      />
      <path d="M48 14v98M14 70h68" stroke="#1B6672" strokeWidth="4" />
      <rect x="2" y="104" width="92" height="8" rx="3" fill="#1B6672" />
    </svg>
  );
}

export function EmptyState({ title, description, action }: PropsWithChildren<EmptyStateProps>) {
  return (
    <div className="entra flex flex-col items-center gap-3 rounded-[24px] border-2 border-dashed border-paper-line bg-paper-surface px-6 py-12 text-center">
      <JanelaVazia />
      <p className="font-display text-xl font-extrabold tracking-tight text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-soft">{description}</p>}
      {action}
    </div>
  );
}
