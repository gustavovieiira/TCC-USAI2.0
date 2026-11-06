import { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import { CeuNoturno } from '@/components/fachada/CeuNoturno';
import { Logo } from '@/components/ui/Logo';
import { LinksLegais } from './LinksLegais';
import { VERSAO_TERMOS } from './versaoTermos';

interface PaginaLegalProps {
  titulo: string;
  resumo: string;
}

/** Moldura das páginas de texto longo (Termos de Uso e Política de Privacidade), sobre o mesmo céu das telas de acesso. */
export function PaginaLegal({ titulo, resumo, children }: PropsWithChildren<PaginaLegalProps>) {
  return (
    <div className="mundo-fachada relative min-h-screen overflow-hidden px-4 py-10">
      <CeuNoturno />
      <div className="relative mx-auto max-w-3xl">
        <Link to="/" aria-label="USAI, voltar para a página inicial" className="inline-block">
          <Logo altura={36} className="text-fachada-papel" />
        </Link>

        <article
          className="sobre-claro mt-6 rounded-[28px] bg-fachada-papel p-6 text-fachada-tinta
            shadow-[0_34px_60px_-28px_rgb(0_0_0/0.85)] sm:p-10"
        >
          <h1 className="font-marca text-[1.9rem] font-extrabold leading-tight tracking-[-0.025em] sm:text-4xl">
            {titulo}
          </h1>
          <p className="mt-2 text-sm text-fachada-tinta-suave">
            {resumo} Versão de {VERSAO_TERMOS.split('-').reverse().join('/')}.
          </p>
          <div className="mt-8 flex flex-col gap-8 leading-relaxed">{children}</div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-fachada-tinta/15 pt-5 text-sm">
            <LinksLegais />
            <Link
              to="/"
              className="inline-block py-2 font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline"
            >
              Voltar para a página inicial
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}

export function Secao({ titulo, children }: PropsWithChildren<{ titulo: string }>) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-marca text-xl font-extrabold tracking-[-0.015em]">{titulo}</h2>
      {children}
    </section>
  );
}
