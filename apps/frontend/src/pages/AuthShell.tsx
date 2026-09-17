import { PropsWithChildren } from 'react';

interface AuthShellProps {
  title: string;
  subtitle: string;
}

export function AuthShell({ title, subtitle, children }: PropsWithChildren<AuthShellProps>) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper bg-cortica bg-cortica-grid px-4">
      <div className="notch-lg w-full max-w-md border border-paper-line bg-paper-surface p-8 shadow-paper-2">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <span className="notch-sm h-5 w-5 bg-barro-500" aria-hidden="true" />
            USAI
          </span>
          <h1 className="mt-3 font-display text-xl font-semibold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
