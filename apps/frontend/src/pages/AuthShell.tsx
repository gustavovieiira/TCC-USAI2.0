import { PropsWithChildren } from 'react';

interface AuthShellProps {
  title: string;
  subtitle: string;
}

export function AuthShell({ title, subtitle, children }: PropsWithChildren<AuthShellProps>) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-brand-600">USAI</span>
          <h1 className="mt-2 text-xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
