interface SpinnerProps {
  className?: string;
}

/** Três pontos pulsando — nenhum spinner circular no produto (ver docs/design-system.md). */
export function Spinner({ className = '' }: SpinnerProps) {
  return (
    <div role="status" aria-label="Carregando" className={`flex items-center gap-1.5 ${className}`}>
      <span className="h-2 w-2 animate-usaiPulse bg-ink-faint" />
      <span className="h-2 w-2 animate-usaiPulse bg-ink-faint [animation-delay:.2s]" />
      <span className="h-2 w-2 animate-usaiPulse bg-ink-faint [animation-delay:.4s]" />
    </div>
  );
}
