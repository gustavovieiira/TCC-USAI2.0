interface SpinnerProps {
  className?: string;
}

/** Três pontos pulsando, nenhum spinner circular no produto (ver docs/design-system.md). */
export function Spinner({ className = '' }: SpinnerProps) {
  return (
    <div role="status" aria-label="Carregando" className={`flex items-center gap-1.5 ${className}`}>
      <span className="h-2 w-2 rounded-full animate-usaiPulse bg-fachada-coral-texto" />
      <span className="h-2 w-2 rounded-full animate-usaiPulse bg-fachada-coral-texto [animation-delay:.2s]" />
      <span className="h-2 w-2 rounded-full animate-usaiPulse bg-fachada-coral-texto [animation-delay:.4s]" />
    </div>
  );
}
