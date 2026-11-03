import { ReactNode } from 'react';

interface ListaRolavelProps {
  children: ReactNode;
  /** Descrição da região, lida por leitores de tela (a lista é focável pelo teclado pra rolar). */
  rotulo: string;
  /** Altura máxima antes de rolar; o padrão acompanha a altura da janela. */
  alturaMaxima?: string;
  className?: string;
}

/**
 * Lista com altura limitada e rolagem própria: a página não cresce conforme chegam itens, e o
 * cabeçalho, o formulário e os filtros acima ficam sempre à vista.
 */
export function ListaRolavel({
  children,
  rotulo,
  alturaMaxima = 'max-h-[65vh]',
  className = '',
}: ListaRolavelProps) {
  return (
    <div
      role="region"
      aria-label={rotulo}
      tabIndex={0} // NOSONAR: região rolável precisa de foco para rolar pelo teclado (WCAG 2.1.1)
      className={`${alturaMaxima} overflow-y-auto overscroll-contain pr-1 focus-visible:outline
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${className}`}
    >
      {children}
    </div>
  );
}
