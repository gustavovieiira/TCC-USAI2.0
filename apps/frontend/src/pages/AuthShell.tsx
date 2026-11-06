import { PropsWithChildren } from 'react';
import { CeuNoturno } from '@/components/fachada/CeuNoturno';
import { ContatoSuporte } from '@/components/ui/ContatoSuporte';
import { Logo } from '@/components/ui/Logo';
import { LinksLegais } from '@/features/privacidade/LinksLegais';

interface AuthShellProps {
  title: string;
  subtitle: string;
}

/** Moldura das telas de acesso: o cartão de papel sobre o céu da USAI, com os prédios acendendo ao fundo. */
export function AuthShell({ title, subtitle, children }: PropsWithChildren<AuthShellProps>) {
  return (
    <div className="mundo-fachada relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <CeuNoturno />
      <div
        className="sobre-claro entra relative w-full max-w-md rounded-[28px] bg-fachada-papel p-7 text-fachada-tinta
          shadow-[0_34px_60px_-28px_rgb(0_0_0/0.85)] sm:p-9"
      >
        <div className="mb-7 text-center">
          <Logo altura={44} className="text-fachada-tinta" />
          <h1 className="mt-4 font-marca text-[1.7rem] font-extrabold leading-tight tracking-[-0.025em]">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-fachada-tinta-suave">{subtitle}</p>
        </div>
        {children}
        <LinksLegais className="mt-5 justify-center text-xs" />
        <ContatoSuporte className="mt-6 border-t border-fachada-tinta/15 pt-4 text-center text-xs text-fachada-tinta-suave" />
      </div>
    </div>
  );
}
