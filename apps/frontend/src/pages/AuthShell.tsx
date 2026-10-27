import { PropsWithChildren } from 'react';
import { Logo } from '@/components/ui/Logo';

interface AuthShellProps {
  title: string;
  subtitle: string;
}

export function AuthShell({ title, subtitle, children }: PropsWithChildren<AuthShellProps>) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper bg-cortica bg-cortica-grid px-4">
      <div className="notch-lg w-full max-w-md border border-paper-line bg-paper-surface p-8 shadow-paper-2">
        <div className="mb-8 text-center">
          <Logo altura={44} className="text-ink" />
          <h1 className="mt-3 font-display text-xl font-semibold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
